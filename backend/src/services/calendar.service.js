const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

class CalendarService {
    getOAuth2Client() {
        return new OAuth2Client({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/calendar/callback`
        });
    }

    getAuthUrl() {
        const client = this.getOAuth2Client();
        return client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });
    }

    async getCredentials(code) {
        const client = this.getOAuth2Client();
        const { tokens } = await client.getToken(code);
        return tokens;
    }

    async createEvent(refreshToken, summary, startTime, endTime, description = null, location = null) {
        try {
            const client = this.getOAuth2Client();
            client.setCredentials({ refresh_token: refreshToken });

            const calendar = google.calendar({ version: 'v3', auth: client });

            const event = {
                summary,
                location: location || '',
                description: description || '',
                start: {
                    dateTime: new Date(startTime).toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: new Date(endTime).toISOString(),
                    timeZone: 'UTC',
                },
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
            });

            return response.data.htmlLink;
        } catch (error) {
            console.error('Calendar Sync Error:', error.message);
            throw error;
        }
    }
}

module.exports = new CalendarService();
