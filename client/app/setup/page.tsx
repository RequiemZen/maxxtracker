// client/app/setup/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { startOfDay, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface GeneralScheduleItem {
  _id: string;
  description: string;
  weekDays?: number[]; // 0-6, где 0 - воскресенье, 6 - суббота
}

interface TemporaryScheduleDefinition {
  _id: string;
  description: string;
  startDate: string;
  endDate: string;
}

const SetupPage = () => {
  const [generalScheduleItems, setGeneralScheduleItems] = useState<GeneralScheduleItem[]>([]);
  const [temporaryScheduleDefinitions, setTemporaryScheduleDefinitions] = useState<TemporaryScheduleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const router = useRouter();

  // State for editing general items
  const [editingItem, setEditingItem] = useState<GeneralScheduleItem | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedWeekDays, setEditedWeekDays] = useState<number[]>([]);

  // State for adding new items
  const [addingItemType, setAddingItemType] = useState<'none' | 'general' | 'temporary'>('none');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemWeekDays, setNewItemWeekDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [newTemporaryStartDate, setNewTemporaryStartDate] = useState<Date>(startOfDay(new Date()));
  const [newTemporaryEndDate, setNewTemporaryEndDate] = useState<Date>(startOfDay(new Date()));

  // State for managing view sections
  const [currentView, setCurrentView] = useState<'none' | 'general' | 'temporary'>('none');

  // States for filtering temporary items by date range
  const [temporaryFilterStartDate, setTemporaryFilterStartDate] = useState<Date>(startOfDay(new Date()));
  const [temporaryFilterEndDate, setTemporaryFilterEndDate] = useState<Date>(startOfDay(new Date()));

  // New states for editing temporary items
  const [editingTemporaryItem, setEditingTemporaryItem] = useState<TemporaryScheduleDefinition | null>(null);
  const [editedTemporaryDescription, setEditedTemporaryDescription] = useState('');
  const [editedTemporaryStartDate, setEditedTemporaryStartDate] = useState<Date>(startOfDay(new Date()));
  const [editedTemporaryEndDate, setEditedTemporaryEndDate] = useState<Date>(startOfDay(new Date()));

  // Новый порядок дней недели: Пн (1), Вт (2), Ср (3), Чт (4), Пт (5), Сб (6), Вс (0)
  const weekDaysLabels = [
    { label: 'Пн', index: 1 },
    { label: 'Вт', index: 2 },
    { label: 'Ср', index: 3 },
    { label: 'Чт', index: 4 },
    { label: 'Пт', index: 5 },
    { label: 'Сб', index: 6 },
    { label: 'Вс', index: 0 },
  ];

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

      // Получаем общие пункты
      const generalRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`, {
        headers: { 'x-auth-token': token },
      });
      setGeneralScheduleItems(generalRes.data);

      // Получаем временные определения
      const temporaryRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/temporary`, {
        headers: { 'x-auth-token': token },
      });
      setTemporaryScheduleDefinitions(temporaryRes.data);

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
  }, [router, setError, setLoading, setGeneralScheduleItems, setTemporaryScheduleDefinitions]);

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

  // Handlers for adding new items
  const onAddGeneralClick = () => {
    setAddingItemType('general');
    setInputError(null);
    setNewItemDescription('');
    setNewItemWeekDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const onAddTemporaryClick = () => {
    setAddingItemType('temporary');
    setInputError(null);
    setNewItemDescription('');
    setNewTemporaryStartDate(startOfDay(new Date()));
    setNewTemporaryEndDate(startOfDay(new Date()));
  };

  const onCancelAddItem = () => {
    setAddingItemType('none');
    setInputError(null);
    setNewItemDescription('');
    setNewItemWeekDays([]);
    setNewTemporaryStartDate(startOfDay(new Date()));
    setNewTemporaryEndDate(startOfDay(new Date()));
  };

  const onSaveGeneralItem = async () => {
    if (!newItemDescription.trim()) {
      setInputError('Пожалуйста, введите описание пункта.');
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

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`,
        {
          description: newItemDescription,
          weekDays: newItemWeekDays.length > 0 ? newItemWeekDays : undefined
        },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );
      setGeneralScheduleItems([...generalScheduleItems, res.data]);
      setNewItemDescription('');
      setNewItemWeekDays([]);
      setAddingItemType('none');
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

  const onSaveTemporaryItem = async () => {
    // Валидация: проверка на пустое описание
    if (!newItemDescription.trim()) {
      setInputError('Пожалуйста, введите описание пункта.');
      return;
    }

    setInputError(null); // Очищаем ошибку ввода, если все проверки пройдены

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }

      // Преобразуем даты в UTC, сохраняя только дату (начало дня)
      const startDateUTC = new Date(Date.UTC(
        newTemporaryStartDate.getFullYear(),
        newTemporaryStartDate.getMonth(),
        newTemporaryStartDate.getDate()
      ));

      const endDateUTC = new Date(Date.UTC(
        newTemporaryEndDate.getFullYear(),
        newTemporaryEndDate.getMonth(),
        newTemporaryEndDate.getDate()
      ));

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/temporary`,
        {
          description: newItemDescription,
          startDate: startDateUTC.toISOString(),
          endDate: endDateUTC.toISOString(),
        },
        { headers: { 'x-auth-token': token } }
      );

      setNewItemDescription('');
      setNewTemporaryStartDate(new Date());
      setNewTemporaryEndDate(new Date());
      setAddingItemType('none');
      fetchScheduleItems();
    } catch (err: any) {
      console.error('Error saving temporary schedule item:', err.response?.data || err.message);
      // Используем setInputError для ошибок, связанных с вводом данных
      setInputError(err.response?.data?.msg || err.message || 'Failed to save temporary schedule item.');
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
      setGeneralScheduleItems(generalScheduleItems.filter(item => item._id !== id));
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
    setEditedWeekDays(item.weekDays || []);
    setInputError(null);
  };

  const onCancelEdit = () => {
    setEditingItem(null);
    setEditedDescription('');
    setEditedWeekDays([]);
    setInputError(null);
  };

  const onSaveEdit = async () => {
    if (!editingItem) return;

    if (!editedDescription.trim()) {
      setInputError('Пожалуйста, введите описание пункта.');
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

      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule/${editingItem._id}`,
        {
          description: editedDescription,
          weekDays: editedWeekDays.length > 0 ? editedWeekDays : undefined
        },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      setGeneralScheduleItems(
        generalScheduleItems.map(item =>
          item._id === editingItem._id ? res.data : item
        )
      );
      setEditingItem(null);
      setEditedDescription('');
      setEditedWeekDays([]);
      setError(null);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setInputError(err.response?.data?.msg || err.message || 'Failed to update schedule item.');
      }
    }
  };

  const onEditTemporaryClick = (item: TemporaryScheduleDefinition) => {
    // Функция для перехода в режим редактирования временного пункта
    setEditingTemporaryItem(item);
    setEditedTemporaryDescription(item.description);
    setEditedTemporaryStartDate(new Date(item.startDate));
    setEditedTemporaryEndDate(new Date(item.endDate));
    setInputError(null); // Очистка ошибок при начале редактирования
  };

  const onCancelTemporaryEdit = () => {
    // Функция для отмены редактирования временного пункта
    setEditingTemporaryItem(null);
    setEditedTemporaryDescription('');
    setEditedTemporaryStartDate(startOfDay(new Date()));
    setEditedTemporaryEndDate(startOfDay(new Date()));
    setInputError(null); // Очистка ошибок при отмене
  };

  const onSaveTemporaryEdit = async () => {
    // Функция для сохранения изменений временного пункта
    if (!editedTemporaryDescription.trim()) {
      setInputError('Пожалуйста, введите описание пункта.');
      return;
    }

    if (!editingTemporaryItem) {
      // Should not happen if the button is only shown when editingTemporaryItem is set
      console.error('No temporary item selected for editing.');
      return;
    }

    setInputError(null); // Очищаем ошибку ввода, если все проверки пройдены

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }

      // Преобразуем даты в UTC, сохраняя только дату (начало дня)
      const startDateUTC = new Date(Date.UTC(
        editedTemporaryStartDate.getFullYear(),
        editedTemporaryStartDate.getMonth(),
        editedTemporaryStartDate.getDate()
      ));

      const endDateUTC = new Date(Date.UTC(
        editedTemporaryEndDate.getFullYear(),
        editedTemporaryEndDate.getMonth(),
        editedTemporaryEndDate.getDate()
      ));

      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/temporary/${editingTemporaryItem._id}`,
        {
          description: editedTemporaryDescription,
          startDate: startDateUTC.toISOString(),
          endDate: endDateUTC.toISOString(),
        },
        { headers: { 'x-auth-token': token } }
      );

      // Обновляем список временных определений на фронтенде новым объектом
      setTemporaryScheduleDefinitions(temporaryScheduleDefinitions.map(item => item._id === res.data._id ? res.data : item));

      setError(null); // Очищаем общую ошибку при успехе
      onCancelTemporaryEdit(); // Выходим из режима редактирования после сохранения
    } catch (err: any) {
      console.error('Error saving temporary schedule item:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        // Используем setInputError для ошибок, связанных с вводом данных или API
        setInputError(err.response?.data?.msg || err.message || 'Failed to save temporary schedule item.');
      }
    }
  };

  const onDeleteTemporary = async (itemId: string) => {
    // Функция для удаления временного пункта
    // TODO: Добавить подтверждение перед удалением
    console.log('Deleting temporary item:', itemId);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }
      // Вызываем DELETE API
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/temporary/${itemId}`, {
        headers: {
          'x-auth-token': token,
        },
      });
      // Обновляем список временных определений на фронтенде
      setTemporaryScheduleDefinitions(temporaryScheduleDefinitions.filter(item => item._id !== itemId));
      setError(null); // Очищаем общую ошибку при успехе
      onCancelTemporaryEdit(); // Выходим из режима редактирования после удаления
    } catch (err: any) {
      console.error('Error deleting temporary schedule item:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        // Используем setError для обратной связи с пользователем
        setError(err.response?.data?.msg || err.message || 'Failed to delete temporary schedule item.');
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
          Назад
        </button>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white text-center mb-8 sm:mb-12">Управление пунктами распорядка дня</h1>

        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-6 py-4 rounded-md relative mb-6 sm:mb-8 w-full max-w-3xl">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Section for adding new items */}
        <div className="shadow-lg rounded-xl p-4 sm:p-8 mb-6 sm:mb-8 w-full max-w-3xl border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4 sm:mb-6">Добавить пункт в расписание</h2>

          {addingItemType === 'none' && (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onAddGeneralClick}
                className="flex-1 px-6 py-4 text-base text-white font-semibold rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
              >
                Добавить общий пункт
              </button>
              <button
                onClick={onAddTemporaryClick}
                className="flex-1 px-6 py-4 text-base text-white font-semibold rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Добавить временный пункт
              </button>
            </div>
          )}

          {(addingItemType === 'general' || addingItemType === 'temporary') && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Описание пункта"
                value={newItemDescription}
                onChange={(e) => { setNewItemDescription(e.target.value); setInputError(null); }}
                maxLength={80}
                className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition duration-300 ease-in-out"
              />
              {addingItemType === 'general' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Дни недели:</label>
                  <div className="flex flex-wrap gap-2">
                    {weekDaysLabels.map(({ label, index }) => (
                      <label key={label} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={newItemWeekDays.includes(index)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewItemWeekDays([...newItemWeekDays, index]);
                            } else {
                              setNewItemWeekDays(newItemWeekDays.filter(d => d !== index));
                            }
                          }}
                          className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded"
                        />
                        <span className="ml-2 text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {addingItemType === 'temporary' && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-300 text-sm flex-shrink-0">От:</span>
                    <DatePicker
                      selected={newTemporaryStartDate}
                      onChange={(date: Date | null) => date && setNewTemporaryStartDate(startOfDay(date))}
                      dateFormat="dd MMMM yyyy"
                      locale={ru}
                      className="flex-1 p-2 border rounded-md text-center bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm cursor-pointer hover:border-gray-500 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-300 text-sm flex-shrink-0">По:</span>
                    <DatePicker
                      selected={newTemporaryEndDate}
                      onChange={(date: Date | null) => date && setNewTemporaryEndDate(startOfDay(date))}
                      dateFormat="dd MMMM yyyy"
                      locale={ru}
                      className="flex-1 p-2 border rounded-md text-center bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm cursor-pointer hover:border-gray-500 w-full"
                    />
                  </div>
                </div>
              )}
              {inputError && <p className="text-red-500 text-sm mt-2">{inputError}</p>}
              <div className="flex flex-col sm:flex-row justify-end gap-4 mt-4 sm:mt-0">
                <button
                  onClick={onCancelAddItem}
                  className="px-6 py-3 text-base text-white font-semibold rounded-md bg-gray-600 hover:bg-gray-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={addingItemType === 'general' ? onSaveGeneralItem : onSaveTemporaryItem}
                  className="px-6 py-3 text-base text-white font-semibold rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Секция для переключения режимов управления - стилизуем кнопки как карточки */}
        {currentView === 'none' && (
          <div className="w-full max-w-3xl mb-6 sm:mb-8 flex flex-col sm:flex-row gap-4">
            {/* Переключатели режимов управления - стилизуем как карточки-кнопки */}
            <button
              onClick={() => setCurrentView('general')}
              // Удаляем лишний gap и оставляем mb-3 на заголовке для соответствия стилю главной страницы
              className="flex-1 p-6 flex flex-col items-start justify-start text-base text-white font-semibold rounded-xl border-2 border-gray-700 hover:border-emerald-500 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
              style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}
            >
              <span className="text-xl font-semibold text-white mb-3 text-left w-full">Редактирование общих пунктов</span>
              <span className="text-base text-gray-400 font-normal text-left w-full mt-auto">Добавление, изменение и удаление постоянно действующих задач.</span>
            </button>
            <button
              onClick={() => setCurrentView('temporary')}
              // Удаляем лишний gap и оставляем mb-3 на заголовке для соответствия стилю главной страницы
              className="flex-1 p-6 flex flex-col items-start justify-start text-base text-white font-semibold rounded-xl border-2 border-gray-700 hover:border-blue-500 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}
            >
              <span className="text-xl font-semibold text-white mb-3 text-left w-full">Редактирование временных пунктов</span>
              <span className="text-base text-gray-400 font-normal text-left w-full mt-auto">Настройка задач, действующих в определенный период.</span>
            </button>
          </div>
        )}

        {/* Секция для отображения общих пунктов (показывается при currentView === 'general') */}
        {currentView === 'general' && (
          <div className="shadow-lg rounded-xl p-4 sm:p-8 w-full max-w-3xl border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
            {/* Контейнер для адаптивного расположения кнопки Назад и заголовка */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <button
                onClick={() => setCurrentView('none')}
                className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:text-white hover:border-gray-500 bg-gray-700 transition duration-300 ease-in-out text-sm flex-shrink-0"
              >
                Назад
              </button>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">Ваши общие пункты расписания:</h2>
            </div>

            {loading ? (
              <p className="text-gray-300 text-base">Загрузка...</p>
            ) : generalScheduleItems.length === 0 ? (
              <p className="text-gray-300 text-base">У вас пока нет общих пунктов расписания.</p>
            ) : (
              <ul className="space-y-4">
                {generalScheduleItems.map((item) => (
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
                              setInputError(null);
                            }}
                            maxLength={80}
                            className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base bg-transparent text-white placeholder-gray-500 focus:outline-none placeholder:text-xs sm:placeholder:text-sm"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Дни недели:</label>
                          <div className="flex flex-wrap gap-2">
                            {weekDaysLabels.map(({ label, index }) => (
                              <label key={label} className="inline-flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editedWeekDays.includes(index)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditedWeekDays([...editedWeekDays, index]);
                                    } else {
                                      setEditedWeekDays(editedWeekDays.filter(d => d !== index));
                                    }
                                  }}
                                  className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded"
                                />
                                <span className="ml-2 text-gray-300">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {inputError && editingItem && <p className="text-red-500 text-sm mt-2">{inputError}</p>}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
                          <button
                            onClick={onSaveEdit}
                            className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition duration-300 ease-in-out text-sm text-center"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={onCancelEdit}
                            className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-gray-600 hover:bg-gray-700 transition duration-300 ease-in-out text-sm text-center"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={() => onDelete(item._id)}
                            className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-rose-600 hover:bg-rose-700 transition duration-300 ease-in-out text-sm text-center"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <>
                        <span className="text-gray-200 text-sm sm:text-base font-medium overflow-wrap break-word flex-grow mr-4">
                          {item.description}
                        </span>
                        <button
                          onClick={() => onEditClick(item)}
                          className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-blue-600 hover:bg-blue-700 transition duration-300 ease-in-out text-sm text-center"
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
        )}

        {/* Секция для отображения временных пунктов (показывается при currentView === 'temporary') */}
        {currentView === 'temporary' && (
          <div className="shadow-lg rounded-xl p-4 sm:p-8 w-full max-w-3xl border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
            {/* Контейнер для адаптивного расположения кнопки Назад и заголовка */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <button
                onClick={() => setCurrentView('none')}
                className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:text-white hover:border-gray-500 bg-gray-700 transition duration-300 ease-in-out text-sm flex-shrink-0"
              >
                Назад
              </button>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">Ваши временные пункты расписания:</h2>
            </div>

            {/* Контейнер для полей дат фильтрации временных пунктов - адаптивный */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
              {/* Строка для "От:" и календаря */}
              <div className="flex items-center gap-4">
                <span className="text-gray-300 text-sm flex-shrink-0">От:</span>
                <DatePicker
                  selected={temporaryFilterStartDate}
                  onChange={(date: Date | null) => date && setTemporaryFilterStartDate(startOfDay(date))}
                  dateFormat="dd MMMM yyyy"
                  locale={ru}
                  className="flex-1 p-2 border rounded-md text-center bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm cursor-pointer hover:border-gray-500 w-full"
                />
              </div>
              {/* Строка для "По:" и календаря */}
              <div className="flex items-center gap-4">
                <span className="text-gray-300 text-sm flex-shrink-0">По:</span>
                <DatePicker
                  selected={temporaryFilterEndDate}
                  onChange={(date: Date | null) => date && setTemporaryFilterEndDate(startOfDay(date))}
                  dateFormat="dd MMMM yyyy"
                  locale={ru}
                  className="flex-1 p-2 border rounded-md text-center bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm cursor-pointer hover:border-gray-500 w-full"
                />
              </div>
            </div>

            {/* Отображение отфильтрованных временных пунктов */}
            {loading ? (
              <p className="text-gray-300 text-base">Загрузка...</p>
            ) : temporaryScheduleDefinitions.length === 0 ? (
              <p className="text-gray-300 text-base">У вас пока нет временных пунктов расписания в выбранном диапазоне.</p>
            ) : (
              <ul className="space-y-4">
                {/* Фильтруем временные пункты по выбранному диапазону дат */}
                {temporaryScheduleDefinitions
                  .filter(def => {
                    const defStartDateUTC = startOfDay(new Date(def.startDate));
                    const defEndDateUTC = startOfDay(new Date(def.endDate));
                    const filterStartUTC = startOfDay(temporaryFilterStartDate);
                    const filterEndUTC = startOfDay(temporaryFilterEndDate);

                    return defEndDateUTC >= filterStartUTC && defStartDateUTC <= filterEndUTC;
                  })
                  .map(item => (
                    // Используем _id как уникальный ключ для временных пунктов
                    <li key={item._id} className="bg-gray-800 bg-opacity-50 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between border border-gray-700 gap-3">
                      {/* Проверяем, редактируется ли текущий временный пункт */}
                      {editingTemporaryItem?._id === item._id ? (
                        // Режим редактирования временного пункта
                        <div className="flex flex-col flex-grow w-full">
                          <div className="flex items-center bg-gray-700 border border-gray-600 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 transition duration-300 ease-in-out w-full mb-2">
                            <input
                              type="text"
                              value={editedTemporaryDescription}
                              onChange={(e) => { setEditedTemporaryDescription(e.target.value); setInputError(null); }}
                              maxLength={80}
                              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base bg-transparent text-white placeholder-gray-500 focus:outline-none placeholder:text-xs sm:placeholder:text-sm"
                            />
                          </div>

                          {/* Редактирование диапазона дат */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-2">
                            {/* Строка для "О:" и календаря */}
                            <div className="flex items-center gap-4">
                              <span className="text-gray-300 text-sm flex-shrink-0">От:</span>
                              <DatePicker
                                selected={editedTemporaryStartDate}
                                onChange={(date: Date | null) => date && setEditedTemporaryStartDate(startOfDay(date))}
                                dateFormat="dd MMMM yyyy"
                                locale={ru}
                                className="flex-1 p-2 border rounded-md text-center bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm cursor-pointer hover:border-gray-500 w-full"
                              />
                            </div>
                            {/* Строка для "По:" и календаря */}
                            <div className="flex items-center gap-4">
                              <span className="text-gray-300 text-sm flex-shrink-0">По:</span>
                              <DatePicker
                                selected={editedTemporaryEndDate}
                                onChange={(date: Date | null) => date && setEditedTemporaryEndDate(startOfDay(date))}
                                dateFormat="dd MMMM yyyy"
                                locale={ru}
                                className="flex-1 p-2 border rounded-md text-center bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm cursor-pointer hover:border-gray-500 w-full"
                              />
                            </div>
                          </div>

                          {inputError && editingTemporaryItem && <p className="text-red-500 text-sm mt-2">{inputError}</p>}

                          {/* Кнопки управления редактированием временного пункта - адаптивные */}
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 w-full">
                            <button
                              onClick={onSaveTemporaryEdit}
                              className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition duration-300 ease-in-out text-sm text-center"
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={() => onCancelTemporaryEdit()}
                              className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-gray-600 hover:bg-gray-700 transition duration-300 ease-in-out text-sm text-center"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={() => onDeleteTemporary(item._id)}
                              className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-rose-600 hover:bg-rose-700 transition duration-300 ease-in-out text-sm text-center"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Режим отображения временного пункта
                        <>
                          <span className="text-gray-200 text-sm sm:text-base font-medium overflow-wrap break-word flex-grow mr-4">
                            {item.description}
                          </span>
                          <span className="text-gray-400 text-xs sm:text-sm flex-shrink-0">
                            {`от ${format(new Date(item.startDate), 'dd.MM.yyyy', { locale: ru })} по ${format(new Date(item.endDate), 'dd.MM.yyyy', { locale: ru })}`}
                          </span>
                          {/* Кнопка Редактировать */}
                          <button
                            onClick={() => onEditTemporaryClick(item)}
                            className="w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-md bg-blue-600 hover:bg-blue-700 transition duration-300 ease-in-out text-sm text-center"
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
        )}

      </div>
    </div>
  );
};

export default SetupPage; 