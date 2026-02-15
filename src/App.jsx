import { useState, useEffect } from "react";
import "./App.css"; // сюда вставь свой style.css

const WEATHER = {
  0: { text: "Ясно", emoji: "☀️" },
  1: { text: "Преимущественно ясно", emoji: "🌤️" },
  2: { text: "Переменная облачность", emoji: "⛅" },
  3: { text: "Пасмурно", emoji: "☁️" },
  45: { text: "Туман", emoji: "🌫️" },
  48: { text: "Изморозь", emoji: "🌫️" },
  51: { text: "Лёгкая морось", emoji: "🌦️" },
  53: { text: "Морось", emoji: "🌦️" },
  55: { text: "Сильная морось", emoji: "🌧️" },
  56: { text: "Переохлаждённая морось (лёгкая)", emoji: "🌧️❄️" },
  57: { text: "Переохлаждённая морось (сильная)", emoji: "🌧️❄️" },
  61: { text: "Лёгкий дождь", emoji: "🌦️" },
  63: { text: "Дождь", emoji: "🌧️" },
  65: { text: "Ливень", emoji: "🌧️" },
  66: { text: "Ледяной дождь (лёгкий)", emoji: "🌧️🧊" },
  67: { text: "Ледяной дождь (сильный)", emoji: "🌧️🧊" },
  71: { text: "Снег", emoji: "🌨️" },
  73: { text: "Снегопад", emoji: "❄️" },
  75: { text: "Сильный снег", emoji: "❄️" },
  77: { text: "Снежные зёрна", emoji: "🌨️" },
  80: { text: "Ливневый дождь", emoji: "🌧️" },
  81: { text: "Сильный ливень", emoji: "🌧️" },
  82: { text: "Очень сильный ливень", emoji: "🌧️" },
  85: { text: "Ливневый снег", emoji: "❄️" },
  86: { text: "Сильный ливневый снег", emoji: "❄️" },
  95: { text: "Гроза", emoji: "⛈️" },
  96: { text: "Гроза с лёгким градом", emoji: "🌩️" },
  99: { text: "Гроза с сильным градом", emoji: "🌩️" },
};

const BACKGROUNDS = {
  clear: "linear-gradient(180deg, #4facfe, #00f2fe)",
  cloudy: "linear-gradient(180deg, #bdc3c7, #2c3e50)",
  rain: "linear-gradient(180deg, #667db6, #485563)",
  thunder: "linear-gradient(180deg, #42275a, #734b6d)",
  snow: "linear-gradient(180deg, #83a4d4, #b6fbff)",
  fog: "linear-gradient(180deg, #757f9a, #d7dde8)",
  default: "linear-gradient(180deg, #4facfe, #00f2fe)",
};

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyBackground = (code) => {
    let bg = BACKGROUNDS.default;
    if ([0, 1].includes(code)) bg = BACKGROUNDS.clear;
    else if ([2, 3].includes(code)) bg = BACKGROUNDS.cloudy;
    else if ([51, 53, 55, 61, 63, 65, 80].includes(code)) bg = BACKGROUNDS.rain;
    else if ([95].includes(code)) bg = BACKGROUNDS.thunder;
    else if ([71, 73, 75].includes(code)) bg = BACKGROUNDS.snow;
    else if ([45, 48].includes(code)) bg = BACKGROUNDS.fog;
    document.body.style.background = bg;
  };

  const applyNightMode = (localTime) => {
    const hour = new Date(localTime).getHours();
    if (hour >= 20 || hour < 6) document.body.classList.add("night");
    else document.body.classList.remove("night");
  };

  const showError = (msg) => setError(msg);
  const hideError = () => setError("");

  const loadByCity = async (cityName) => {
    if (!cityName) return;
    setLoading(true);
    hideError();
    setWeather(null);
    setHourly([]);
    setForecast([]);

    try {
      // Геокодинг
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityName
      )}&count=1&language=ru&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error("Ошибка геокодинга");
      const geoData = await geoRes.json();
      const place = geoData?.results?.[0];
      if (!place) throw new Error("Город не найден");
      const { latitude, longitude, name, country, timezone } = place;

      // Погода: текущая + прогноз
      const wUrl = `
      https://api.open-meteo.com/v1/forecast?
      latitude=${latitude}
      &longitude=${longitude}
      &current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code
      &hourly=temperature_2m,weather_code
      &daily=weather_code,temperature_2m_max,temperature_2m_min
      &timezone=auto
      `.replace(/\s+/g, "");

      const wRes = await fetch(wUrl);
      if (!wRes.ok) throw new Error("Не удалось получить погоду");
      const wData = await wRes.json();

      // Текущая погода
      const code = wData.current?.weather_code;
      const wm = WEATHER[code] || { text: "Неизвестно", emoji: "❔" };
      setWeather({
        city: `${name}${country ? ", " + country : ""}`,
        temp: wData.current?.temperature_2m ?? "—",
        wind: wData.current?.wind_speed_10m ?? "—",
        hum: wData.current?.relative_humidity_2m ?? "—",
        timezone: wData.timezone ?? timezone,
        emoji: wm.emoji,
        text: wm.text,
        updated: new Date().toLocaleString(),
        code,
        time: wData.current?.time,
      });

      // Почасовой прогноз (24 часа)
      const hourlyData = [];
      const hoursLimit = Math.min(wData.hourly?.time?.length ?? 0, 24);
      for (let i = 0; i < hoursLimit; i++) {
        const hCode = wData.hourly.weather_code?.[i];
        const hEmoji = WEATHER[hCode]?.emoji || "❔";
        hourlyData.push({
          time: wData.hourly.time[i],
          temp: wData.hourly.temperature_2m[i],
          emoji: hEmoji,
        });
      }
      setHourly(hourlyData);

      // 5-дневный прогноз
      const dailyData = [];
      const daysCount = Math.min(wData.daily?.time?.length ?? 0, 5);
      for (let i = 0; i < daysCount; i++) {
        const dCode = wData.daily.weather_code?.[i];
        const wmDay = WEATHER[dCode] || { text: "—", emoji: "❔" };
        dailyData.push({
          date: wData.daily.time[i],
          emoji: wmDay.emoji,
          text: wmDay.text,
          tmin: wData.daily.temperature_2m_min?.[i],
          tmax: wData.daily.temperature_2m_max?.[i],
        });
      }
      setForecast(dailyData);

      // Фон и ночь/день
      applyBackground(code);
      applyNightMode(wData.current?.time);
    } catch (err) {
      showError(err.message || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  // Авто-загрузка
  useEffect(() => {
    loadByCity("Bishkek");
  }, []);

  return (
    <div className="app">
      {/* Поиск */}
      <div className="search-box glass">
        <input
          type="text"
          placeholder="Введите город..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadByCity(city)}
        />
        <button onClick={() => loadByCity(city)}>🔍</button>
      </div>

      {/* Лоадер */}
      {loading && <div className="loader"></div>}

      {/* Ошибка */}
      {error && <div className="error">{error}</div>}

      {/* Результат */}
      {weather && (
        <div className="result glass">
          {/* Текущая погода */}
          <div className="current">
            <h2 className="city-name">{weather.city}</h2>
            <div className="weather-now">
              <div className="emoji">{weather.emoji}</div>
              <div className="temp-block">
                <span className="temperature">{weather.temp}°C</span>
                <span className="weather-text">{weather.text}</span>
                <span className="timezone">{weather.timezone}</span>
              </div>
            </div>

            <div className="extra">
              <div className="extra-item">💧 {weather.hum}%</div>
              <div className="extra-item">💨 {weather.wind} м/с</div>
            </div>

            <div className="updated">Обновлено: {weather.updated}</div>
          </div>

          {/* Почасовой прогноз */}
          <h3 className="forecast-title">Почасовой прогноз</h3>
          <div className="hourly">
            {hourly.map((h, i) => (
              <div key={i} className="hour-card">
                <div className="time">{new Date(h.time).getHours()}:00</div>
                <div className="emoji">{h.emoji}</div>
                <div className="temp">{Math.round(h.temp)}°</div>
              </div>
            ))}
          </div>

          {/* Прогноз на 5 дней */}
          <h3 className="forecast-title">Прогноз на 5 дней</h3>
          <div className="forecast">
            {forecast.map((f, i) => (
              <div key={i} className="card-day">
                <div className="date">{new Date(f.date).toLocaleDateString()}</div>
                <div className="emoji">{f.emoji}</div>
                <div className="text">{f.text}</div>
                <div className="temps">
                  {Math.round(f.tmin)}° / {Math.round(f.tmax)}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
