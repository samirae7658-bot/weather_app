// Open-Meteo API Endpoints
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const COUNTRIES_API = 'https://restcountries.com/v3.1/all?fields=name,cca2';

// Mode Switching Elements
const btnCityMode = document.getElementById('btn-city');
const btnCountryMode = document.getElementById('btn-country');
const searchContainer = document.getElementById('search-container');
const selectionContainer = document.getElementById('selection-container');

// Search Elements
const locationInput = document.getElementById('location-input');
const resultsDropdown = document.getElementById('results-dropdown');

// Selection Elements
const countrySelect = document.getElementById('country-select');
const citySelect = document.getElementById('city-select');
const citySelectWrapper = document.getElementById('city-select-wrapper');

// Display Elements
const weatherInfo = document.getElementById('weather-info');
const loader = document.getElementById('loader');
const displayCity = document.getElementById('display-city');
const displayCountry = document.getElementById('display-country');
const displayTemp = document.getElementById('display-temp');
const displayCondition = document.getElementById('display-condition');
const displayHumidity = document.getElementById('display-humidity');
const displayWind = document.getElementById('display-wind');
const displayApparent = document.getElementById('display-apparent');
const displayUV = document.getElementById('display-uv');

// --- Initialization ---

init();

function init() {
    setupModeSwitching();
    setupSearch();
    populateCountries();
}

// --- Mode Switching Logic ---

function setupModeSwitching() {
    btnCityMode.onclick = () => {
        setMode('city');
    };
    btnCountryMode.onclick = () => {
        setMode('country');
    };
}

function setMode(mode) {
    if (mode === 'city') {
        btnCityMode.classList.add('active');
        btnCountryMode.classList.remove('active');
        searchContainer.style.display = 'block';
        selectionContainer.style.display = 'none';
        weatherInfo.style.display = 'none';
    } else {
        btnCountryMode.classList.add('active');
        btnCityMode.classList.remove('active');
        selectionContainer.style.display = 'block';
        searchContainer.style.display = 'none';
        weatherInfo.style.display = 'none';
    }
}

// --- Search Mode Logic ---

function setupSearch() {
    let debounceTimer;
    locationInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 3) {
            resultsDropdown.style.display = 'none';
            return;
        }
        debounceTimer = setTimeout(() => searchLocations(query), 500);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            resultsDropdown.style.display = 'none';
        }
    });
}

async function searchLocations(query) {
    try {
        const response = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        const data = await response.json();
        if (data.results) renderResults(data.results);
    } catch (err) { console.error(err); }
}

function renderResults(results) {
    resultsDropdown.innerHTML = '';
    results.forEach(loc => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.textContent = `${loc.name}, ${loc.country}`;
        div.onclick = () => selectLocation(loc);
        resultsDropdown.appendChild(div);
    });
    resultsDropdown.style.display = 'block';
}

// --- Country Selection Mode Logic ---

async function populateCountries() {
    try {
        const response = await fetch(COUNTRIES_API);
        const countries = await response.json();
        countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        
        countries.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.cca2;
            opt.textContent = c.name.common;
            countrySelect.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

countrySelect.onchange = async (e) => {
    const countryCode = e.target.value;
    const countryName = countrySelect.options[countrySelect.selectedIndex].text;
    citySelectWrapper.style.display = 'block';
    citySelect.innerHTML = '<option value="" disabled selected>Loading cities...</option>';
    
    // Use geocoding API to find major cities by searching for the country name itself
    // and filtering by country code to get a list of locations IN that country.
    try {
        const response = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(countryName)}&count=100&language=en`);
        const data = await response.json();
        
        citySelect.innerHTML = '<option value="" disabled selected>Choose City</option>';
        if (data.results) {
            // Filter results that belong to this country code and are likely cities/locations
            const cities = data.results.filter(r => r.country_code === countryCode);
            
            if (cities.length === 0) {
                const opt = document.createElement('option');
                opt.disabled = true;
                opt.textContent = "No major cities found";
                citySelect.appendChild(opt);
            } else {
                cities.forEach(city => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify(city);
                    opt.textContent = city.name + (city.admin1 ? `, ${city.admin1}` : '');
                    citySelect.appendChild(opt);
                });
            }
        }
    } catch (err) { 
        console.error(err);
        citySelect.innerHTML = '<option value="" disabled selected>Error loading cities</option>';
    }
};

citySelect.onchange = (e) => {
    const cityData = JSON.parse(e.target.value);
    selectLocation(cityData);
};

// --- Weather Data Handling ---

async function selectLocation(loc) {
    resultsDropdown.style.display = 'none';
    weatherInfo.style.display = 'none';
    loader.style.display = 'block';

    try {
        const weatherUrl = `${WEATHER_API}?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index&timezone=auto`;
        const response = await fetch(weatherUrl);
        const data = await response.json();
        displayWeather(loc, data.current);
    } catch (error) {
        console.error(error);
        alert('Weather data unavailable.');
    } finally {
        loader.style.display = 'none';
    }
}

function getWeatherDescription(code) {
    const codes = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Mod. drizzle',
        55: 'Dense drizzle', 61: 'Light rain', 63: 'Mod. rain', 65: 'Heavy rain',
        71: 'Slight snow', 73: 'Mod. snow', 75: 'Heavy snow', 77: 'Snow grains',
        80: 'Light showers', 81: 'Mod. showers', 82: 'Violent showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm'
    };
    return codes[code] || 'Cloudy';
}

function displayWeather(loc, current) {
    displayCity.textContent = loc.name;
    displayCountry.textContent = loc.country;
    displayTemp.innerHTML = `${Math.round(current.temperature_2m)}<span>°C</span>`;
    displayCondition.textContent = getWeatherDescription(current.weather_code);
    displayHumidity.textContent = `${current.relative_humidity_2m}%`;
    displayWind.textContent = `${current.wind_speed_10m} km/h`;
    displayApparent.textContent = `${Math.round(current.apparent_temperature)}°C`;
    displayUV.textContent = current.uv_index.toFixed(1);
    weatherInfo.style.display = 'block';
}
