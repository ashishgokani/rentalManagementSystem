from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from app.core.config import settings
import json
import logging

SCOPES = ['https://www.googleapis.com/auth/calendar.events']

class CalendarService:
    def get_oauth_flow(self):
        """Create OAuth flow"""
        return Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=f"{settings.FRONTEND_URL}/calendar/callback" 
            # Note: Need to register this redirect URI in Google Console
            # Or reuse existing and handle logic there.
            # For simplicity, let's assume we use a dedicated route in frontend
        )

    def get_auth_url(self):
        """Get Authorization URL"""
        flow = self.get_oauth_flow()
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent' # Force consent to get refresh token
        )
        return authorization_url

    def get_credentials(self, code):
        """Exchange code for credentials"""
        flow = self.get_oauth_flow()
        flow.fetch_token(code=code)
        return flow.credentials

    def create_event(self, refresh_token, summary, start_time, end_time, description=None, location=None):
        """Create an event in Google Calendar"""
        try:
            creds = Credentials(
                None, # Access token (will be refreshed)
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=SCOPES
            )
            
            # Refresh if needed
            if not creds.valid:
                creds.refresh(Request())

            service = build('calendar', 'v3', credentials=creds)
            
            event = {
                'summary': summary,
                'location': location or '',
                'description': description or '',
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'UTC',
                },
            }

            event = service.events().insert(calendarId='primary', body=event).execute()
            return event.get('htmlLink')
            
        except Exception as e:
            logging.error(f"Calendar Sync Error: {str(e)}")
            raise e

calendar_service = CalendarService()
