import { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  city: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obtenir la position de l'utilisateur
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Fallback sur Paris si la géolocalisation échoue
          fetchWeatherByCity('Paris');
        }
      );
    } else {
      fetchWeatherByCity('Paris');
    }
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      // Utiliser l'API OpenWeatherMap gratuite
      // Note: En production, l'API key devrait être dans les secrets
      const apiKey = ''; // À configurer via secrets
      if (!apiKey) {
        setError('Configuration météo incomplète');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${apiKey}`
      );
      const data = await response.json();

      setWeather({
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // m/s vers km/h
        city: data.name,
      });
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement de la météo');
      setLoading(false);
    }
  };

  const fetchWeatherByCity = async (city: string) => {
    try {
      const apiKey = ''; // À configurer via secrets
      if (!apiKey) {
        setError('API météo non configurée');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=fr&appid=${apiKey}`
      );
      const data = await response.json();

      setWeather({
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6),
        city: data.name,
      });
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement de la météo');
      setLoading(false);
    }
  };

  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case 'Clear':
        return <Sun className="w-12 h-12 text-yellow-500" />;
      case 'Rain':
        return <CloudRain className="w-12 h-12 text-blue-500" />;
      case 'Snow':
        return <CloudSnow className="w-12 h-12 text-blue-300" />;
      case 'Clouds':
        return <Cloud className="w-12 h-12 text-gray-400" />;
      default:
        return <Cloud className="w-12 h-12 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Météo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || 'Configuration requise'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Ajoutez une clé API OpenWeatherMap dans les secrets
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{weather.city}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getWeatherIcon(weather.icon)}
            <div className="text-4xl font-bold">{weather.temp}°</div>
          </div>
        </div>
        
        <div>
          <p className="text-sm capitalize text-foreground/80">{weather.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Wind className="w-4 h-4" />
            <span>{weather.windSpeed} km/h</span>
          </div>
          <div className="flex items-center gap-1">
            <CloudRain className="w-4 h-4" />
            <span>{weather.humidity}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
