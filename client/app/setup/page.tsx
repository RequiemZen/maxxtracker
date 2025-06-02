// client/app/setup/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { startOfDay, formatISO } from 'date-fns';

interface GeneralScheduleItem {
  _id: string;
  description: string;
}

const SetupPage = () => {
  const [description, setDescription] = useState('');
  const [scheduleItems, setScheduleItems] = useState<GeneralScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const router = useRouter();

  // State for editing
  const [editingItem, setEditingItem] = useState<GeneralScheduleItem | null>(null);
  const [editedDescription, setEditedDescription] = useState('');

  const fetchScheduleItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        setLoading(false);
        return;
      }
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`, {
        headers: {
          'x-auth-token': token,
        },
      });
      setScheduleItems(res.data);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to fetch schedule items.');
      }
    } finally {
      setLoading(false);
    }
  }, [router, setError, setLoading, setScheduleItems]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('sessionExpired', 'true');
      router.push('/auth');
      setLoading(false);
      return;
    }

    fetchScheduleItems();
  }, [router, fetchScheduleItems]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputError(null);
    setDescription(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!description.trim()) {
      setInputError('Пожалуйста, введите описание пункта.');
      return;
    }

    const isDuplicate = scheduleItems.some(item => item.description.toLowerCase() === description.trim().toLowerCase());
    if (isDuplicate) {
      setInputError('Пункт с таким описанием уже существует. Пожалуйста, выберите другое название.');
      return;
    }

    setInputError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }
      const dateForApi = formatISO(startOfDay(new Date()), { representation: 'complete' });
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`, { description, date: dateForApi }, {
        headers: {
          'x-auth-token': token,
        },
      });
      setScheduleItems([...scheduleItems, res.data]);
      setDescription('');
      setError(null);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setInputError(err.response?.data?.msg || err.message || 'Failed to add schedule item.');
      }
    }
  };

  const onDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule/${id}`, {
        headers: {
          'x-auth-token': token,
        },
      });
      setScheduleItems(scheduleItems.filter(item => item._id !== id));
      setError(null);
      setEditingItem(null); // Close edit mode after deleting
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to delete schedule item.');
      }
    }
  };

  const onEditClick = (item: GeneralScheduleItem) => {
    setEditingItem(item);
    setEditedDescription(item.description);
    setInputError(null); // Clear input error when starting edit
  };

  const onCancelEdit = () => {
    setEditingItem(null);
    setEditedDescription('');
    setInputError(null); // Clear input error on cancel
  };

  const onSaveEdit = async () => {
    if (!editedDescription.trim()) {
      setInputError('Пожалуйста, введите описание пункта.');
      return;
    }
    if (editedDescription.trim() === editingItem?.description.trim()) {
      // No change, just exit edit mode
      setEditingItem(null);
      setEditedDescription('');
      setInputError(null);
      return;
    }

    const isDuplicate = scheduleItems.some(item =>
      item._id !== editingItem?._id && item.description.toLowerCase() === editedDescription.trim().toLowerCase()
    );
    if (isDuplicate) {
      setInputError('Пункт с таким описанием уже существует. Пожалуйста, выберите другое название.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule/${editingItem?._id}`, { description: editedDescription }, {
        headers: {
          'x-auth-token': token,
        },
      });
      setScheduleItems(scheduleItems.map(item => item._id === res.data._id ? res.data : item));
      setEditingItem(null);
      setEditedDescription('');
      setError(null); // Clear general error on success
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        // Use inputError for feedback related to the specific edit attempt
        setInputError(err.response?.data?.msg || err.message || 'Failed to update schedule item.');
      }
    }
  };

  return (
    <div className="h-screen overflow-y-auto content-wrapper-scrollbar bg-dark-bg text-gray-200">
      <div className="flex flex-col items-center p-4 pt-10 sm:p-8 sm:pt-16">
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 text-base sm:top-8 sm:left-8 sm:text-lg text-gray-400 hover:text-white transition duration-300 ease-in-out"
        >
          &larr; Назад
        </button>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white text-center mb-8 sm:mb-12">Составить общий распорядок дня</h1>

        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-6 py-4 rounded-md relative mb-6 sm:mb-8 w-full max-w-3xl">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="shadow-lg rounded-xl p-4 sm:p-8 mb-6 sm:mb-8 w-full max-w-3xl border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4 sm:mb-6">Добавить новый пункт</h2>
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex flex-col flex-grow w-full">
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 transition duration-300 ease-in-out w-full">
                <input
                  type="text"
                  placeholder="Например: Пробежка утром, Чтение 30 мин"
                  value={description}
                  onChange={onChange}
                  maxLength={80}
                  className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base bg-transparent text-white placeholder-gray-500 focus:outline-none placeholder:text-xs sm:placeholder:text-sm"
                />
              </div>
              {inputError && !editingItem && <p className="text-red-500 text-sm mt-2">{inputError}</p>}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-4 text-base text-white font-semibold rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
            >
              Добавить
            </button>
          </form>
        </div>

        <div className="shadow-lg rounded-xl p-4 sm:p-8 w-full max-w-3xl border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4 sm:mb-6">Ваши пункты расписания:</h2>
          {loading ? (
            <p className="text-gray-300 text-base">Загрузка...</p>
          ) : scheduleItems.length === 0 ? (
            <p className="text-gray-300 text-base">У вас пока нет пунктов расписания.</p>
          ) : (
            <ul className="space-y-4">
              {scheduleItems.map((item) => (
                <li key={item._id} className="bg-gray-800 bg-opacity-50 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between border border-gray-700 gap-3">
                  {editingItem?._id === item._id ? (
                    // Edit mode
                    <div className="flex flex-col flex-grow w-full">
                      <div className="flex items-center bg-gray-700 border border-gray-600 rounded-xl focus-within:ring-2 focus-within:ring-amber-500 transition duration-300 ease-in-out w-full mb-2">
                        <input
                          type="text"
                          value={editedDescription}
                          onChange={(e) => {
                            setEditedDescription(e.target.value);
                            setInputError(null); // Clear input error when typing
                          }}
                          maxLength={80}
                          className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base bg-transparent text-white placeholder-gray-500 focus:outline-none placeholder:text-xs sm:placeholder:text-sm"
                        />
                      </div>
                      {inputError && editingItem && <p className="text-red-500 text-sm mt-2">{inputError}</p>}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
                        <button
                          onClick={onSaveEdit}
                          className="w-full sm:w-auto px-4 py-2 text-white font-semibold rounded-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition duration-300 ease-in-out text-sm text-center"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="w-full sm:w-auto px-4 py-2 text-white font-semibold rounded-md bg-gray-600 hover:bg-gray-700 transition duration-300 ease-in-out text-sm text-center"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => onDelete(item._id)}
                          className="w-full sm:w-auto px-4 py-2 text-white font-semibold rounded-md bg-rose-600 hover:bg-rose-700 transition duration-300 ease-in-out text-sm text-center"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <>
                      <span
                        className={`text-gray-200 text-base sm:text-lg font-medium flex-grow break-all min-w-0 whitespace-normal`}
                      >
                        {item.description}
                      </span>
                      <button
                        onClick={() => onEditClick(item)}
                        className="w-full sm:w-auto px-4 py-2 text-white font-semibold rounded-md bg-blue-600 hover:bg-blue-700 transition duration-300 ease-in-out text-sm"
                      >
                        Редактировать
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;