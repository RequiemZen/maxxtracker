'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const AuthPage = () => {
  const [username, setUsername] = useState('');
  const router = useRouter();
  // Removed modal states
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [modalMessage, setModalMessage] = useState('');

  // Add state for input validation error
  const [inputError, setInputError] = useState('');

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally verify token with backend if needed, but for simple check:
      router.replace('/'); // Redirect to home page
    }
  }, [router]); // Depend on router object

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear error when user starts typing
    setInputError('');
    setUsername(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Manual check for empty username
    if (!username.trim()) { // Use trim() to check for whitespace only input
      setInputError('Пожалуйста, введите ваш никнейм.');
      return;
    }

    // Clear any previous input error on successful submission attempt
    setInputError('');

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, { username });

      // Store token in localStorage
      localStorage.setItem('token', res.data.token);

      // Redirect to the main page (e.g., home)
      router.push('/');

    } catch (err: any) {
      console.error(err.response?.data || err.message);
      // For API errors, you might still want a different notification,
      // but for now, we'll just log it or could set inputError with a generic message.
      // setInputError('Ошибка сервера. Пожалуйста, попробуйте позже.');
      // Or a more specific error message from the backend:
      setInputError(err.response?.data?.message || 'Произошла ошибка при входе.');
    }
  };

  // Removed closeModal function
  // const closeModal = () => {
  //   setIsModalOpen(false);
  // };

  // Define a dark gradient for the button, similar to main page cubes
  // const buttonGradient = 'linear-gradient(110.01deg, rgb(0, 100, 200) 8.7%, rgb(0, 50, 150) 40.24%)'; // Example blue gradient

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-bg text-gray-200 p-4">
      {/* Increased max-w, padding, and rounded-xl for a larger, more rounded form container */}
      <div className="px-12 py-10 mt-8 text-left shadow-lg rounded-xl w-full max-w-lg border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
        {/* Increased text size and margin for the title */}
        <h1 className="text-4xl font-bold text-white text-center mb-10">Введите ваш ник</h1>
        <form onSubmit={onSubmit} className="mt-6">
          {/* Increased margin-bottom for the input group */}
          <div className="mb-8">
            {/* Increased margin-bottom for the label */}
            <label className="block text-gray-300 text-base font-medium mb-2" htmlFor="username">Никнейм</label>
            {/* Increased padding and rounded-xl for the input container, changed focus ring color */}
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 transition duration-300 ease-in-out">
              {/* Removed the duplicate 'Ник' span */}
              <input
                type="text"
                placeholder="Ваш никнейм"
                name="username"
                id="username"
                value={username}
                onChange={onChange}
                // Removed the default `required` attribute
                // required
                className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 focus:outline-none text-base"
              />
            </div>
            {/* Display input error message here */}
            {inputError && <p className="text-red-500 text-sm mt-2">{inputError}</p>}
          </div>
          {/* Increased top margin for the button div */}
          <div className="flex items-baseline justify-end mt-8">
            {/* Restyled the button with a green gradient, increased padding, and rounded-xl */}
            <button
              type="submit"
              className="px-10 py-4 text-white font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition duration-300 ease-in-out w-full"
              style={{ background: 'linear-gradient(180deg, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 100%)' }} // Green gradient
            >
              Войти
            </button>
          </div>
        </form>

        {/* Removed Modal Structure */}
        {/* {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="px-8 py-6 text-left bg-dark-card shadow-lg rounded-md w-full max-w-sm border border-gray-700 text-gray-200">
              <h2 className="text-xl font-bold text-white mb-4">Ошибка</h2>
              <p>{modalMessage}</p>
              <div className="flex justify-end mt-6">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 text-white font-semibold rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-300 ease-in-out"
                  style={{ background: 'linear-gradient(180deg, rgba(100, 116, 139, 1) 0%, rgba(71, 85, 105, 1) 100%)' }} // Gray gradient
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default AuthPage; 