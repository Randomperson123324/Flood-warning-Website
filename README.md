# Flood Monitoring Dashboard

A comprehensive flood monitoring system using Raspberry Pi, ultrasonic sensors, and a Next.js dashboard with Supabase integration for school safety.

## Features

- 🌊 Real-time flood level monitoring
- 📊 Interactive charts and analytics
- ⚠️ Flood warning calculations and alerts
- 🌤️ Weather forecast integration with city display
- 🔧 Developer settings panel (Password: **admin123**)
- 📱 Responsive design
- ⚡ Real-time data updates

## About This System

This flood monitoring system is designed to help schools monitor water levels in areas prone to flooding. The system uses:

- **Raspberry Pi** with ultrasonic sensors to measure water depth
- **Real-time alerts** when water levels reach dangerous thresholds
- **Weather integration** to predict potential flooding based on rainfall forecasts
- **Trend analysis** to calculate how quickly water levels are rising

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Run the SQL scripts in the `scripts` folder:
   - `create-water-readings-table.sql`
   - `insert-sample-data.sql` (for testing)

### 2. OpenWeather API Setup

1. Sign up at [openweathermap.org](https://openweathermap.org/api)
2. Get your free API key
3. Add it to your environment variables (server-side only)

### 3. Environment Variables

Create a `.env.local` file in your project root:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENWEATHER_API_KEY=your_openweather_api_key

# Cloudflare Turnstile (for Developer Settings CAPTCHA)
# The public site key is fetched from the server-side API route.
CLOUDFLARE_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key # This is now a server-only variable
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret_key # Secret key for server-side verification

# Location Configuration (Optional - defaults to Bangkok)
LATITUDE=13.7563
LONGITUDE=100.5018
CITY_NAME=Bangkok
\`\`\`

**Important:** The OpenWeather API key, Cloudflare Turnstile Site Key, and Secret Key are all handled server-side for security. The Cloudflare Turnstile Site Key is then exposed to the client via a dedicated API route.


### 4. Changing the City/Location

You can change the weather location in **two ways**:

#### Method 1: Environment Variables (Recommended)
Edit your `.env.local` file and add/modify these variables:

\`\`\`env
# For your specific city, find the coordinates and add:
LATITUDE=your_latitude
LONGITUDE=your_longitude
CITY_NAME=Your City Name

# Examples:
# Bangkok: LATITUDE=13.7563 LONGITUDE=100.5018 CITY_NAME=Bangkok
# New York: LATITUDE=40.7128 LONGITUDE=-74.0060 CITY_NAME=New York
# London: LATITUDE=51.5074 LONGITUDE=-0.1278 CITY_NAME=London
# Manila: LATITUDE=14.5995 LONGITUDE=120.9842 CITY_NAME=Manila
\`\`\`

#### Method 2: Edit the API Route Directly
If you prefer to hardcode the location, edit `app/api/weather/route.ts`:

\`\`\`typescript
// Find this section and change the coordinates:
const lat = parseFloat(process.env.LATITUDE || "YOUR_LATITUDE") 
const lon = parseFloat(process.env.LONGITUDE || "YOUR_LONGITUDE")
const cityName = process.env.CITY_NAME || "YOUR_CITY_NAME"
\`\`\`

#### Finding Your City's Coordinates:
1. Go to [latlong.net](https://www.latlong.net/)
2. Search for your city
3. Copy the latitude and longitude values
4. Add them to your environment variables

**Note:** After changing the location, restart your development server or redeploy your application.

### 5. Raspberry Pi Setup

#### Hardware Connections

**Ultrasonic Sensor (HC-SR04):**
- VCC → 5V (Pin 2)
- GND → Ground (Pin 6)
- Trig → GPIO 18 (Pin 12)
- Echo → GPIO 24 (Pin 18)

#### Software Setup

1. **Install dependencies:**
   \`\`\`bash
   sudo apt update
   sudo apt install python3-pip git
   pip3 install supabase requests RPi.GPIO
   \`\`\`

2. **Configure the sensor script:**
   - Create `flood_sensor.py` with your Supabase credentials
   - Update sensor height measurements for your location

3. **Run the sensor script:**
   \`\`\`bash
   python3 flood_sensor.py
   \`\`\`

### 6. Web Dashboard Setup

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Run the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Access the dashboard:**
   Open [http://localhost:3000](http://localhost:3000)

## Configuration

### Developer Settings

**Password:** `admin123`

Access developer settings by clicking the settings icon in the top-right corner.

**Available Settings:**
- Supabase URL and API key
- Flood warning levels (50cm and 100cm defaults)
- Update intervals

**Weather Configuration:**
Weather data is now fetched securely through a server-side API. The OpenWeather API key should be set as a server environment variable. The city name and coordinates are displayed in the weather card.

### Sensor Calibration

For flood monitoring, configure your sensor:
- **Height**: Mount 2-3 meters above ground level
- **Location**: In the area most prone to flooding
- **Protection**: Use weatherproof housing
- **Calibration**: Set ground level as 0cm baseline

## Database Schema

\`\`\`sql
CREATE TABLE water_readings (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level DECIMAL(6,2) NOT NULL CHECK (level >= 0 AND level &lt;= 500),
  temperature DECIMAL(4,1),
  sensor_id VARCHAR(50) NOT NULL DEFAULT 'raspberry_pi_1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

## API Endpoints

- **GET /api/weather**: Fetches weather data securely from OpenWeather API
- **GET /api/turnstile-sitekey**: Fetches the Cloudflare Turnstile public site key
- **Supabase**: Real-time database updates for water level data

## Weather Display Features

- **City Name**: Shows the actual city name from the weather API
- **Country Code**: Displays the country abbreviation
- **Coordinates**: Shows the exact latitude and longitude being monitored
- **Current Conditions**: Temperature, humidity, wind speed, and description
- **5-Day Forecast**: Daily weather predictions with precipitation data

## Security

- OpenWeather API key is handled server-side only
- Supabase keys use Row Level Security
- Developer settings are password protected
- Cloudflare Turnstile site key is fetched from server, not exposed in client bundle

## Deployment

### Environment Variables for Production

Set these environment variables in your deployment platform:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENWEATHER_API_KEY=your_openweather_api_key
CLOUDFLARE_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key # Now a server-only variable
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret_key
LATITUDE=your_latitude
LONGITUDE=your_longitude
CITY_NAME=your_city_name
\`\`\`

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Troubleshooting

**Weather Data Not Loading:**
- Check server logs for API errors
- Verify OPENWEATHER_API_KEY is set server-side
- Ensure API key is activated (can take up to 2 hours)
- Check that LATITUDE, LONGITUDE, and CITY_NAME are set correctly

**Wrong City Showing:**
- Verify your LATITUDE and LONGITUDE environment variables
- Check that CITY_NAME matches your location
- Restart your development server after changing environment variables

**No Data in Dashboard:**
- Check Supabase credentials
- Verify Raspberry Pi internet connection
- Check service logs

**CAPTCHA Not Loading/Verifying:**
- Ensure `CLOUDFLARE_TURNSTILE_SITE_KEY` and `CLOUDFLARE_TURNSTILE_SECRET_KEY` are correctly set in your environment variables (both local and Vercel).
- Check browser console for any network errors when fetching `/api/turnstile-sitekey`.
- Verify your Cloudflare Turnstile site key is active and correctly configured in your Cloudflare dashboard.

## License

MIT License - see LICENSE file for details
\`\`\`
