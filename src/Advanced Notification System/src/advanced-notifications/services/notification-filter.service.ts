import { Injectable } from "@nestjs/common";
import {
  NotificationPreference,
  NotificationPriority,
  NotificationCategory,
} from "../entities/notification-preference.entity";

export interface FilterRule {
  field: string;
  operator:
    | "equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in";
  value: any;
}

export interface NotificationContext {
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  data: Record<string, any>;
  marketConditions?: Record<string, any>;
  portfolioData?: Record<string, any>;
}

@Injectable()
export class NotificationFilterService {
  private priorityWeights = {
    [NotificationPriority.LOW]: 1,
    [NotificationPriority.MEDIUM]: 2,
    [NotificationPriority.HIGH]: 3,
    [NotificationPriority.CRITICAL]: 4,
  };

  shouldSendNotification(
    preference: NotificationPreference,
    context: NotificationContext
  ): boolean {
    // Check if category matches
    if (preference.category !== context.category) {
      return false;
    }

    // Check minimum priority
    if (
      this.priorityWeights[context.priority] <
      this.priorityWeights[preference.minimumPriority]
    ) {
      return false;
    }

    // Check if preference is active
    if (!preference.isActive) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours(preference.scheduleSettings)) {
      return context.priority === NotificationPriority.CRITICAL;
    }

    // Apply custom filters
    if (preference.filters && !this.applyFilters(preference.filters, context)) {
      return false;
    }

    return true;
  }

  private isInQuietHours(scheduleSettings?: any): boolean {
    if (!scheduleSettings?.quietHours) {
      return false;
    }

    const now = new Date();
    const timezone = scheduleSettings.timezone || "UTC";
    const currentTime = now.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour12: false,
    });

    const { start, end } = scheduleSettings.quietHours;

    if (scheduleSettings.workdaysOnly) {
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend
        return true;
      }
    }

    return currentTime >= start && currentTime <= end;
  }

  private applyFilters(
    filters: Record<string, any>,
    context: NotificationContext
  ): boolean {
    for (const [key, filterConfig] of Object.entries(filters)) {
      if (!this.evaluateFilter(key, filterConfig, context)) {
        return false;
      }
    }
    return true;
  }

  private evaluateFilter(
    key: string,
    filterConfig: any,
    context: NotificationContext
  ): boolean {
    const value = this.getNestedValue(context, key);

    switch (filterConfig.operator) {
      case "equals":
        return value === filterConfig.value;
      case "contains":
        return String(value).includes(filterConfig.value);
      case "greater_than":
        return Number(value) > Number(filterConfig.value);
      case "less_than":
        return Number(value) < Number(filterConfig.value);
      case "in":
        return (
          Array.isArray(filterConfig.value) &&
          filterConfig.value.includes(value)
        );
      case "not_in":
        return (
          Array.isArray(filterConfig.value) &&
          !filterConfig.value.includes(value)
        );
      default:
        return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  calculateNotificationScore(context: NotificationContext): number {
    let score = this.priorityWeights[context.priority] * 10;

    // Add market condition boost
    if (context.marketConditions?.volatility > 0.8) {
      score += 5;
    }

    // Add portfolio performance boost
    if (context.portfolioData?.changePercent) {
      const change = Math.abs(context.portfolioData.changePercent);
      if (change > 10) score += 10;
      else if (change > 5) score += 5;
    }

    return score;
  }
}
