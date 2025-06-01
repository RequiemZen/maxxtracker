'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
// Import icons from react-icons
import { IoMdEyeOff, IoMdEye } from 'react-icons/io';
// Import icons if you have a library like react-icons
// import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Example import

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility for password field
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State to toggle password visibility for confirm password field
  const router = useRouter();
  const searchParams = useSearchParams(); // Инициализация useSearchParams

  // Removed modal states
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [modalMessage, setModalMessage] = useState('');

  // Add state for input validation error
  const [inputError, setInputError] = useState('');
  // Add state specifically for password match error
  const [passwordMatchError, setPasswordMatchError] = useState('');
  // Добавлено: состояние для отображения временного сообщения
  const [tempMessage, setTempMessage] = useState<string | null>(null);
  // Добавлено: состояние для управления видимостью уведомления с анимацией
  const [showNotification, setShowNotification] = useState(false);

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally verify token with backend if needed, but for simple check:
      router.replace('/'); // Redirect to home page
    }
  }, [router]); // Depend on router object

  // Эффект для проверки параметра sessionExpired и отображения уведомления
  useEffect(() => {
    if (searchParams.get('sessionExpired') === 'true') {
      setTempMessage('Сессия завершена. Войдите снова.');
      setShowNotification(true); // Показываем уведомление
      // Удаляем параметр из URL после отображения сообщения
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('sessionExpired');
      router.replace(`${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`);
    }
  }, [searchParams, router]); // Зависит от searchParams и router

  // Эффект для скрытия уведомления через 3 секунды с анимацией
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false); // Запускаем анимацию скрытия
        // setTempMessage(null); // Очищаем сообщение после скрытия (опционально)
      }, 3000); // Скрываем через 3 секунды
      return () => clearTimeout(timer); // Очистка таймера при размонтировании или изменении showNotification
    }
  }, [showNotification]); // Зависит от showNotification

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear general input error when user starts typing
    setInputError('');
    // Clear password match error when typing in password or confirm password
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setPasswordMatchError('');
    }

    const { name, value } = e.target;
    switch (name) {
      case 'username':
        setUsername(value);
        break;
      case 'password':
        setPassword(value);
        // Real-time check for password match only in registration mode
        if (!isLogin && confirmPassword && value !== confirmPassword) {
          setPasswordMatchError('Пароли не совпадают.');
        } else if (!isLogin) {
          setPasswordMatchError(''); // Clear error if they now match or confirmPassword is empty
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        // Real-time check for password match only in registration mode
        if (!isLogin && password && value !== password) {
          setPasswordMatchError('Пароли не совпадают.');
        } else if (!isLogin) {
          setPasswordMatchError(''); // Clear error if they now match or password is empty
        }
        break;
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!username.trim()) {
      setInputError('Пожалуйста, введите ваш никнейм.');
      return;
    }

    if (!password) {
      setInputError('Пожалуйста, введите пароль.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      // This check should ideally be caught by real-time validation,
      // but keeping it here as a fallback for form submission.
      setInputError('Пароли не совпадают.'); // Using general input error for submission failure
      return;
    }
    // Prevent submission if real-time password match error exists in registration mode
    if (!isLogin && passwordMatchError) {
      // setInputError(passwordMatchError); // Optionally show under username/generic spot too
      return; // Prevent submission if passwords don't match
    }

    setInputError(''); // Clear general input error on successful validation
    setPasswordMatchError(''); // Clear password match error on successful validation

    try {
      const endpoint = isLogin ? 'login' : 'register';
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${endpoint}`, {
        username,
        password
      });

      localStorage.setItem('token', res.data.token);
      router.push('/');

    } catch (err: any) {
      console.error('Error details:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error message:', err.message);
      // console.error(err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || 'Произошла ошибка при входе.';
      setInputError(errorMessage);
    }
  };

  // Function to toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-bg text-gray-200 p-4">
      {/* Отображение временного сообщения с анимацией */}
      {tempMessage && (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-700 text-white px-6 py-3 rounded-md shadow-lg z-50 text-center transition-all duration-500 ease-in-out ${showNotification ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
          {tempMessage}
        </div>
      )}
      <div className="px-4 sm:px-12 py-10 mt-8 text-left shadow-lg rounded-xl w-full max-w-lg border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
        <h1 className="text-4xl font-bold text-white text-center mb-10">
          {isLogin ? 'Вход' : 'Регистрация'}
        </h1>
        <form onSubmit={onSubmit} className="mt-6">
          <div className="mb-8">
            <label className="block text-gray-300 text-base font-medium mb-2" htmlFor="username">Никнейм</label>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 transition duration-300 ease-in-out mb-2">
              <input
                type="text"
                placeholder="Ваш никнейм"
                name="username"
                id="username"
                value={username}
                onChange={onChange}
                className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 focus:outline-none text-base"
              />
            </div>
            {/* Display general input error message here */}
            {inputError && !passwordMatchError && <p className="text-red-500 text-sm mt-3">{inputError}</p>}
          </div>

          <div className="mb-8">
            <label className="block text-gray-300 text-base font-medium mb-2" htmlFor="password">Пароль</label>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 transition duration-300 ease-in-out pr-4">
              {/* Added pr-4 for spacing for the eye icon */}
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ваш пароль"
                name="password"
                id="password"
                value={password}
                onChange={onChange}
                className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 focus:outline-none text-base"
              />
              {/* Eye Icon Button */}
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-400 hover:text-white focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {/* Replace with actual SVG icons or use text */}
                {/* Example with react-icons: */}
                {showPassword ? <IoMdEyeOff /> : <IoMdEye />} {/* Using react-icons */}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="mb-8">
              <label className="block text-gray-300 text-base font-medium mb-2" htmlFor="confirmPassword">Подтвердите пароль</label>
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 transition duration-300 ease-in-out pr-4">
                {/* Added pr-4 for spacing for the eye icon */}
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Повторите пароль"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={onChange}
                  className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 focus:outline-none text-base"
                />
                {/* Eye Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-white focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {/* Replace with actual SVG icons or use text */}
                  {/* {showConfirmPassword ? '👁️' : '🙈'} */}
                  {/* Example with react-icons: */}
                  {showConfirmPassword ? <IoMdEyeOff /> : <IoMdEye />} {/* Using react-icons */}
                </button>
              </div>
              {/* Display password match error message here */}
              {passwordMatchError && <p className="text-red-500 text-sm mt-2">{passwordMatchError}</p>}
            </div>
          )}

          <div className="flex flex-col items-center sm:flex-row sm:items-baseline sm:justify-between mt-8">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setInputError(''); // Clear errors on form switch
                setPasswordMatchError(''); // Clear password match error on form switch
                setUsername(''); // Clear fields on form switch
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-emerald-500 hover:text-emerald-400 transition duration-300 ease-in-out text-sm mb-4 sm:mb-0"
            // Reduced font size for the switch button
            >
              {isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт?'}
            </button>
            <button
              type="submit"
              className="px-10 py-4 text-white font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition duration-300 ease-in-out"
              style={{ background: 'linear-gradient(180deg, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 100%)' }}
            >
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
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