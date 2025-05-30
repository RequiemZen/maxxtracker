'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link for better navigation
// import Image from "next/image"; // Keep Image if you still plan to use it later, otherwise remove

const HomePage = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null: checking, false: not auth, true: auth

  useEffect(() => {
    // This runs only on the client after initial render
    const token = localStorage.getItem('token');

    if (!token) {
      // If no token, redirect to auth page
      router.push('/auth');
    } else {
      // TODO: Optionally, verify token validity with backend here
      console.log('User is authenticated (token found)');
      setIsAuthenticated(true); // Mark as authenticated
      // If token is found and valid, stay on this page
      // You would typically fetch user data or schedule here
    }
  }, [router]); // Dependency array ensures effect runs when router changes (rare) or on mount

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth');
  };

  // Render based on authentication status
  if (isAuthenticated === null) {
    // While checking auth status (initial render and until useEffect completes)
    return <div className="flex items-center justify-center min-h-screen bg-dark-bg text-gray-200">Загрузка статуса аутентификации...</div>; // Dark background, light text
  }

  if (!isAuthenticated) {
    // User is not authenticated (should be redirected by useEffect, but this is a fallback)
    return null; // Or a message/spinner, but useEffect handles the redirect
  }

  // Increased height and font sizes for larger buttons
  const baseButtonClasses = "p-8 rounded-lg shadow-lg h-64 flex flex-col justify-between transform transition duration-500 ease-in-out";

  const gradient1 = 'linear-gradient(120deg, rgb(20, 25, 33) 10%, rgb(5, 9, 17) 50%)'; // Different angle
  const gradient2 = 'linear-gradient(140deg, rgb(20, 25, 33) 10%, rgb(5, 9, 17) 50%)'; // Different angle
  const gradient3 = 'linear-gradient(200deg, rgb(20, 25, 33) 10%, rgb(5, 9, 17) 50%)'; // Different angle
  const gradientLogout = 'linear-gradient(100deg, rgb(30, 31, 37) 10%, rgb(36, 40, 46) 50%)'; // Gray gradient, different angle

  // User is authenticated, render the main page content
  return (
    // Wrapper div with min-h-screen, overflow-y-auto, and flex centering
    <div className="min-h-screen overflow-y-auto content-wrapper-scrollbar bg-dark-bg text-gray-200 flex flex-col items-center justify-center">
      {/* Main content container - removed flex centering as it's on the wrapper, kept padding */}
      <div className="p-8">
        {/* Header Section - adjusted mb */}
        <div className="text-center mb-8">
          {/* Title with softer text shadow */}
          <h1 className="text-5xl font-extrabold text-white mb-4">MaxxTracker</h1>
          {/* Shortened description, centered with increased max-width */}
          <p className="text-xl text-gray-300 max-w-md mx-auto">Отслеживайте и визуализируйте ваш ежедневный прогресс и распорядок дня.</p>
        </div>

        {/* Navigation Cubes - adjusted mt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto mt-6">
          {/* Setup Cube */}
          <Link href="/setup" className="block w-full h-full">
            <div className={`${baseButtonClasses} border border-gray-700 hover:border-blue-500`} style={{ background: gradient1 }}>
              {/* Reduced font size for title */}
              <h2 className="text-xl font-semibold mb-3 text-white">Составить общий распорядок дня</h2>
              {/* Reduced font size for description */}
              <p className="text-base text-gray-400">Настройте ваши повторяющиеся задачи и цели.</p>
            </div>
          </Link>

          {/* Check-in Cube */}
          <Link href="/checkin" className="block w-full h-full">
            <div className={`${baseButtonClasses} border border-gray-700 hover:border-green-500`} style={{ background: gradient2 }}>
              {/* Reduced font size for title */}
              <h2 className="text-xl font-semibold mb-3 text-white">Календарь (Чек-ин)</h2>
              {/* Reduced font size for description */}
              <p className="text-base text-gray-400">Отмечайте выполнение задач на каждый день.</p>
            </div>
          </Link>

          {/* Users Cube */}
          <Link href="/users" className="block w-full h-full">
            <div className={`${baseButtonClasses} border border-gray-700 hover:border-purple-500`} style={{ background: gradient3 }}>
              {/* Reduced font size for title */}
              <h2 className="text-xl font-semibold mb-3 text-white">Другие юзеры</h2>
              {/* Reduced font size for description */}
              <p className="text-base text-gray-400">Посмотрите, как справляются другие пользователи.</p>
            </div>
          </Link>
        </div>

        {/* Logout Cube - adjusted mt and max-w for spacing/centering */}
        <div className="flex justify-center mt-20 w-full max-w-md mx-auto">
          <button onClick={handleLogout} className="block w-full text-left">
            {/* Adjusted padding/height for consistency and increased font sizes */}
            <div className="p-6 rounded-lg shadow-lg border border-gray-600 hover:border-gray-400 flex flex-col justify-between transform transition duration-500 ease-in-out" style={{ background: gradientLogout, height: 'auto' }}>
              {/* Reduced font size for title */}
              <h2 className="text-xl font-semibold mb-3 text-white">Выйти</h2>
              {/* Reduced font size for description */}
              <p className="text-base text-gray-400">Завершить текущую сессию.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
