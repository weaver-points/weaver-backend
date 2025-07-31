// Example usage and configuration

/\*
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvancedNotificationsModule } from './advanced-notifications/advanced-notifications.module';

@Module({
imports: [
TypeOrmModule.forRoot({
type: 'postgres',
host: 'localhost',
port: 5432,
username: 'your_username',
password: 'your_password',
database: 'your_database',
entities: [__dirname + '/**/*.entity{.ts,.js}'],
synchronize: true, // Don't use in production
}),
AdvancedNotificationsModule,
],
})
export class AppModule {}

// Environment variables (.env)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=your_sendgrid_api_key
FIREBASE_PROJECT_ID=your_firebase_project

// Example API usage:

// 1. Create notification
POST /advanced-notifications
{
"title": "Portfolio Alert",
"message": "Your portfolio has gained 5% today!",
"category": "portfolio",
"priority": "medium",
"userIds": ["user-123"],
"data": {
"portfolioId": "portfolio-456",
"changePercent": 5.2
}
}

// 2. Update user preferences
PUT /advanced-notifications/preferences
{
"userId": "user-123",
"category": "portfolio",
"enabledChannels": ["email", "push"],
"minimumPriority": "medium",
"scheduleSettings": {
"quietHours": { "start": "22:00", "end": "08:00" },
"timezone": "America/New_York"
}
}

// 3. Create template
POST /advanced-notifications/templates
{
"name": "portfolio_gain_email",
"category": "portfolio",
"channel": "email",
"subject": "🎉 Portfolio Update: {{changePercent}}% Gain!",
"template": "<h1>Great News!</h1><p>Your portfolio has gained {{changePercent}}% today, reaching a total value of ${{totalValue}}.</p>"
}

// 4. Track engagement
POST /advanced-notifications/analytics/track
{
"notificationId": "notif_123",
"userId": "user-123",
"category": "portfolio",
"channel": "email",
"action": "opened"
}
\*/
