// DOMS
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const themeToggle = document.getElementById("themeToggle");
const forecast = document.getElementById("forecast");
const unitToggle = document.querySelectorAll(".unit-btn"); 

const weatherCodes = {
  0: 'CLEAR', 1: 'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
  45: 'FOG', 48: 'FOG', 51: 'DRIZZLE', 53: 'DRIZZLE', 55: 'DRIZZLE',
  61: 'RAIN', 63: 'RAIN', 65: 'RAIN', 66: 'FREEZING RAIN', 67: 'FREEZING RAIN',
  71: 'SNOW', 73: 'SNOW', 75: 'SNOW', 77: 'SNOW', 80: 'SHOWERS', 81: 'SHOWERS',
  82: 'SHOWERS', 85: 'SNOW', 86: 'SNOW', 95: 'THUNDERSTORM', 96: 'THUNDERSTORM', 99: 'THUNDERSTORM'
};

let currentUnit = "C";
let currentData = null;

// Functions

const CtoF = (c) => {
    return (c * 9 / 5) + 32;
}

const formatTemp = (c) => {
    let tempVal; 
    if (currentUnit === 'F') tempVal = CtoF(c);
    else tempVal = c;

    return Math.round(tempVal);
}

const formatTime = (isoString) => {
    let date = new Date(isoString);
    let hr = date.getHours();
    let min  = date.getMinutes();
    
    let AM_or_PM = 'AM';
    if (hr >= 12) AM_or_PM =  'PM';
    hr = hr % 12 || 12;
    return `${hr}:${min} ${AM_or_PM}`;
}

const UV_Cat = (uv) => {
    if (uv <= 2) return 'LOW';
  if (uv <= 5) return 'MODERATE';
  if (uv <= 7) return 'HIGH';
  if (uv <= 10) return 'VERY HIGH';
  return 'EXTREME';
}

// API Call
// 1. City Coordinates

async function fetchCityCoordinates(city){
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const data = await response.json();

    
    if (!data.results || data.results.length === 0){ 
        throw new Error('City Not Found');
    }
    return data.results[0]; 
}

async function fetchWeather(lat,lon) {
    const parameters = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,uv_index',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
        timezone: 'auto',
        forecast_days: '7'
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${parameters}`); 
    if(!response.ok){
        throw new Error('Weather Fetch Failed');
    }
    return response.json(); 
}

async function searchWeather(city) {
    try{
        searchBtn.textContent = "Loading..."; 
        searchBtn.disabled = true;

        const geoLocation = await fetchCityCoordinates(city);
        const weather = await fetchWeather(geoLocation.latitude, geoLocation.longitude); 

        currentData = {geoLocation, weather};
        renderWeather();
    } catch(error) { 
        document.getElementById('cityName').textContent = 'Error';
        document.getElementById('condition').textContent = error.message; 
    } finally{
        searchBtn.textContent = 'SEARCH';
        searchBtn.disabled = false;
    }    
}

async function renderWeather() {
    const geo = currentData.geoLocation;
    const weather = currentData.weather;
    const current = weather.current;

    document.getElementById('cityName').textContent = `${geo.name.toUpperCase()}, ${geo.country_code}`;
    document.getElementById('condition').textContent = weatherCodes[current.weather_code] || 'UNKNOWN';
    document.getElementById('tempValue').textContent = formatTemp(current.temperature_2m);
    document.getElementById('tempUnit').textContent = `°${currentUnit}`;
    document.getElementById('feelsLike').textContent = `${formatTemp(current.apparent_temperature)}°${currentUnit}`;
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('sunTimes').textContent =
    `${formatTime(weather.daily.sunrise[0])} / ${formatTime(weather.daily.sunset[0])}`;

    const uv = current.uv_index;
    document.getElementById('uvValue').textContent = uv !== null ? Math.round(uv) : 'N/A';
    document.getElementById('uvCategory').textContent = uv !== null ? UV_Cat(uv) : 'NO DATA'; 

    renderForecast(weather.daily);
}

async function renderForecast(daily) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    forecast.innerHTML = ''; 

  for (let i = 0; i < 7; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? 'TODAY' : days[date.getDay()];
    const code = daily.weather_code[i];

    const el = document.createElement('div');
    el.className = 'forecast-day' + (i === 0 ? ' today' : '');
    el.innerHTML = `
      <div class="day">${dayName}</div>
      <div class="cond">${weatherCodes[code] || '--'}</div>
      <div class="temp-box">
        <span class="temp-high">↑${formatTemp(daily.temperature_2m_max[i])}°</span>
        <span class="temp-low">↓${formatTemp(daily.temperature_2m_min[i])}°</span>
      </div>
    `;
    forecast.appendChild(el); 
  }    
}

// Handle UI

function toggleTheme() {
  const html = document.documentElement;
  const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? 'LIGHT' : 'DARK';
}

function setUnit(unit) {
  if (unit === currentUnit) return;
  currentUnit = unit;

  unitToggle.forEach(function(btn) { 
    if (btn.dataset.unit === unit) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
  });

  if (currentData) renderWeather();
}

function updateClock() {
  const now = new Date();
  let hr = now.getHours();
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12 || 12;
  document.getElementById('currentTime').textContent = `${hr}:${min}:${sec} ${ampm}`;

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  document.getElementById('currentDate').textContent =
    `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`;
}

//Event Listeners

searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) searchWeather(city);
});

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && cityInput.value.trim()) {
    searchWeather(cityInput.value.trim());
  }
});

themeToggle.addEventListener('click', toggleTheme);

unitToggle.forEach(btn => {
  btn.addEventListener('click', () => setUnit(btn.dataset.unit));
});

setInterval(updateClock, 1000);

updateClock();

searchWeather('Dhaka');