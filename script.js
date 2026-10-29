
const form = document.querySelector("#search-form");
const input = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const message = document.querySelector("#message");
const weatherSection = document.querySelector("#weather");

const $ = id => document.getElementById(id);

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Moderate drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Moderate rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Moderate snow", "❄️"],
  75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Moderate showers", "🌧️"],
  82: ["Heavy showers", "🌧️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Severe thunderstorm", "⛈️"]
};

// FEATURE 1: Status and error messages
function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

// FEATURE 2: Safe number formatting
function formatNumber(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

// FEATURE 3: Date formatting
function formatDay(dateString) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    timeZone: "UTC"
  }).format(new Date(`${dateString}T12:00:00Z`));
}

// FEATURE 4: Fetch API with HTTP error handling
async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// FEATURE 5: Search city using geocoding API
async function searchWeather(city) {
  const geoURL = new URL(
    "https://geocoding-api.open-meteo.com/v1/search"
  );

  geoURL.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json"
  });

  const geoData = await fetchJSON(geoURL);

  if (!geoData.results || geoData.results.length === 0) {
    throw new Error("City not found. Check the spelling and try again.");
  }

  const place = geoData.results[0];

  // FEATURE 6: Request live weather and daily forecast
  const weatherURL = new URL(
    "https://api.open-meteo.com/v1/forecast"
  );

  weatherURL.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "uv_index"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min"
    ].join(","),
    timezone: "auto",
    forecast_days: "6"
  });

  const data = await fetchJSON(weatherURL);

  renderWeather(place, data);
}

// FEATURE 7: Render nested JSON data into the DOM
function renderWeather(place, data) {
  const current = data.current;
  const daily = data.daily;

  if (
    !current ||
    !daily ||
    !Array.isArray(daily.time) ||
    !Array.isArray(daily.weather_code) ||
    !Array.isArray(daily.temperature_2m_max) ||
    !Array.isArray(daily.temperature_2m_min) ||
    daily.time.length < 6
  ) {
    throw new Error("Weather data is incomplete. Please try again.");
  }

  const condition = weatherCodes[current.weather_code] ||
    ["Unknown conditions", "🌡️"];

  $("city-name").textContent = [
    place.name,
    place.admin1,
    place.country
  ].filter(Boolean).filter((item, index, array) =>
    array.indexOf(item) === index
  ).join(", ");

  $("local-time").textContent =
    `Local time: ${current.time.replace("T", " ")} (${data.timezone})`;

  $("temperature").textContent = formatNumber(current.temperature_2m);
  $("feels-like").textContent = formatNumber(current.apparent_temperature);
  $("condition").textContent = condition[0];
  $("weather-icon").textContent = condition[1];

  $("humidity").textContent = formatNumber(current.relative_humidity_2m);
  $("wind").textContent = formatNumber(current.wind_speed_10m);
  $("pressure").textContent = formatNumber(current.pressure_msl);
  $("cloud-cover").textContent = formatNumber(current.cloud_cover);
  $("uv-index").textContent = formatNumber(current.uv_index, 1);

  $("min-temp").textContent =
    `${formatNumber(daily.temperature_2m_min[0])}°`;

  $("max-temp").textContent =
    `${formatNumber(daily.temperature_2m_max[0])}°`;

  // FEATURE 8: Dynamically build five forecast cards
  const forecast = $("forecast");
  forecast.replaceChildren();

  daily.time.slice(1, 6).forEach((date, index) => {
    const i = index + 1;
    const code = weatherCodes[daily.weather_code[i]] ||
      ["Unknown", "🌡️"];

    const card = document.createElement("article");
    card.className = "forecast-day";

    const day = document.createElement("span");
    day.className = "day";
    day.textContent = formatDay(date);

    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = code[1];

    const temperatures = document.createElement("strong");
    temperatures.textContent =
      `${formatNumber(daily.temperature_2m_max[i])}° / ${formatNumber(daily.temperature_2m_min[i])}°`;

    const description = document.createElement("small");
    description.textContent = code[0];

    card.append(day, icon, temperatures, description);
    forecast.appendChild(card);
  });

  $("updated").textContent =
    `Data time: ${current.time.replace("T", " ")} · ${data.timezone}`;

  weatherSection.classList.remove("hidden");
}

// FEATURE 9: Form submission, loading state and comprehensive error handling
form.addEventListener("submit", async event => {
  event.preventDefault();

  const city = input.value.trim();

  if (!city) {
    showMessage("Please enter a city name.", true);
    input.focus();
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Loading...";
  showMessage(`Fetching weather for ${city}...`);
  weatherSection.classList.add("hidden");

  try {
    await searchWeather(city);
    showMessage(`Weather loaded for ${city}.`);
  } catch (error) {
    console.error("Weather request failed:", error);

    if (error instanceof TypeError) {
      showMessage(
        "Network error. Check your internet connection and try again.",
        true
      );
    } else {
      showMessage(
        error.message || "Something went wrong. Please try again.",
        true
      );
    }
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search ↗";
  }
});
