// client/app/checkin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import DatePicker from 'react-datepicker'; // Import DatePicker
import 'react-datepicker/dist/react-datepicker.css'; // Import DatePicker styles
import { useRouter } from 'next/navigation'; // Import useRouter

interface GeneralScheduleItem {
  _id: string;
  description: string;
  weekDays?: number[]; // 0-6, где 0 - воскресенье, 6 - суббота
}

// Interface for Temporary Schedule Item Definition (as received from backend GET endpoint)
interface TemporaryScheduleDefinition {
  _id: string;
  description: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  createdAt: string; // Added createdAt for sorting
}

// Interface for Actual Schedule Entry (check-in, as received from backend GET endpoint)
interface ActualScheduleEntry {
  _id: string; // ID of the actual check-in entry
  definitionId: string;
  description: string; // Description of the item this entry is for
  date: string; // Date of the check-in (UTC ISO string)
  status?: 'completed' | 'not_completed'; // Actual status for this date
  reason?: string;
}

// Interface for displaying items on the checkin page (combined from definitions and entries)
interface DisplayScheduleItem {
  // Используем definitionId как уникальный идентификатор пункта для отображения
  definitionId: string;
  description: string;
  isTemporary: boolean; // Indicate if this item originated from a temporary definition

  // Status and reason for the *selected day* (from ActualScheduleEntry)
  status?: 'completed' | 'not_completed' | null;
  reason?: string;

  // Store the _id of the actual entry if it exists, for updates/deletions
  actualEntryId?: string;
}

// Добавляем функцию для получения userId из JWT токена
function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user?.id || null;
  } catch {
    return null;
  }
}

const CheckinPage = () => {
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  // scheduleItems state will now hold the combined list for display on selectedDate
  const [scheduleItems, setScheduleItems] = useState<DisplayScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReason, setEditingReason] = useState<string | null>(null);
  const [tempReason, setTempReason] = useState<string>('');
  const [, setError] = useState<string | null>(null);

  const router = useRouter();

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

      // Получаем userId из токена
      const userId = getUserIdFromToken(token);

      // Получаем общие пункты
      const generalRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`, {
        headers: { 'x-auth-token': token },
      });

      // Получаем временные определения
      const temporaryRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/temporary`, {
        headers: { 'x-auth-token': token },
      });

      // Получаем фактические записи для выбранной даты
      const selectedDateUTC = new Date(Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      ));
      const endDateUTC = new Date(selectedDateUTC);
      endDateUTC.setDate(endDateUTC.getDate() + 1);

      // Добавляем userId в параметры запроса и корректный диапазон дат
      const scheduleRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule?userId=${userId}&start_date=${selectedDateUTC.toISOString()}&end_date=${endDateUTC.toISOString()}`,
        {
          headers: { 'x-auth-token': token },
        }
      );

      // Фильтруем общие пункты по дням недели
      const filteredGeneralItems = generalRes.data.filter((item: GeneralScheduleItem) => {
        if (!item.weekDays || item.weekDays.length === 0) {
          return true; // Если дни недели не указаны, показываем на все дни
        }
        const dayOfWeek = selectedDate.getDay(); // 0-6, где 0 - воскресенье
        return item.weekDays.includes(dayOfWeek);
      });

      // Объединяем отфильтрованные общие пункты с временными
      const combinedItems: DisplayScheduleItem[] = [
        ...filteredGeneralItems.map((item: GeneralScheduleItem) => ({
          definitionId: item._id,
          description: item.description,
          isTemporary: false,
        })),
        ...temporaryRes.data
          .filter((item: TemporaryScheduleDefinition) => {
            const startDate = new Date(item.startDate);
            const endDate = new Date(item.endDate);
            return selectedDateUTC >= startDate && selectedDateUTC <= endDate;
          })
          .map((item: TemporaryScheduleDefinition) => ({
            definitionId: item._id,
            description: item.description,
            isTemporary: true,
          })),
      ];

      // Сортируем по времени создания для временных пунктов
      combinedItems.sort((a, b) => {
        if (a.isTemporary && b.isTemporary) {
          const aDate = new Date(temporaryRes.data.find((item: TemporaryScheduleDefinition) => item._id === a.definitionId)?.createdAt || 0);
          const bDate = new Date(temporaryRes.data.find((item: TemporaryScheduleDefinition) => item._id === b.definitionId)?.createdAt || 0);
          return aDate.getTime() - bDate.getTime();
        }
        return 0;
      });

      // Объединяем с фактическими записями
      const actualEntries = scheduleRes.data.actualEntries || [];
      const displayItems = combinedItems.map(item => {
        const actualEntry = actualEntries.find(
          (entry: ActualScheduleEntry) =>
            entry.definitionId === item.definitionId &&
            new Date(entry.date).toISOString().split('T')[0] === selectedDateUTC.toISOString().split('T')[0]
        );
        return {
          ...item,
          status: actualEntry?.status || null,
          reason: actualEntry?.reason,
          actualEntryId: actualEntry?._id,
        };
      });
      setScheduleItems(displayItems);
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
  }, [selectedDate, router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('sessionExpired', 'true');
      router.push('/auth');
      setLoading(false);
      return;
    }
    fetchScheduleItems();
  }, [selectedDate, router, fetchScheduleItems]);


  // handleCheckInToggle needs significant changes to work with the new DisplayScheduleItem structure
  const handleCheckInToggle = async (itemToToggle: DisplayScheduleItem, desiredStatus: 'completed' | 'not_completed' | null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }

      const dateOfToggleUTC = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));

      // Если текущий статус совпадает с desiredStatus, значит пользователь хочет снять статус
      const currentStatus = itemToToggle.status;
      if (currentStatus === desiredStatus) {
        desiredStatus = null;
      }

      // Находим существующую запись по definitionId
      const existingActualEntry = scheduleItems.find(item =>
        item.definitionId === itemToToggle.definitionId && item.actualEntryId
      );

      if (existingActualEntry) {
        if (desiredStatus === null) {
          // Удаляем запись если статус снимается
          await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${existingActualEntry.actualEntryId}`, {
            headers: { 'x-auth-token': token },
          });

          // Обновляем UI локально, используя definitionId для поиска
          setScheduleItems(scheduleItems.map(item =>
            item.definitionId === itemToToggle.definitionId
              ? { ...item, status: undefined, reason: undefined, actualEntryId: undefined }
              : item
          ));
        } else {
          // Обновляем существующую запись
          const updateData: any = { status: desiredStatus };
          if (desiredStatus === 'completed') {
            updateData.reason = null;
          }

          await axios.put(
            `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${existingActualEntry.actualEntryId}`,
            updateData,
            { headers: { 'x-auth-token': token } }
          );

          // Обновляем UI локально, используя definitionId для поиска
          setScheduleItems(scheduleItems.map(item =>
            item.definitionId === itemToToggle.definitionId
              ? { ...item, status: desiredStatus, reason: desiredStatus === 'completed' ? undefined : item.reason }
              : item
          ));
        }
      } else if (desiredStatus !== null) {
        // Создаем новую запись с definitionId
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule`, {
          date: dateOfToggleUTC.toISOString(),
          // Отправляем definitionId на бэкенд
          definitionId: itemToToggle.definitionId,
          description: itemToToggle.description, // Описание все еще нужно для отображения
          status: desiredStatus,
          reason: desiredStatus === 'completed' ? null : undefined,
        }, {
          headers: { 'x-auth-token': token },
        });

        // Обновляем UI локально, используя definitionId для поиска
        setScheduleItems(scheduleItems.map(item =>
          item.definitionId === itemToToggle.definitionId
            ? { ...item, status: desiredStatus, actualEntryId: res.data._id }
            : item
        ));
      }

    } catch (err: any) {
      console.error('Error during check-in toggle:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      }
    }
  };


  // handleSaveReason and handleEditReason need updates to work with actualEntryId
  const handleSaveReason = async (itemToUpdate: DisplayScheduleItem) => {
    // Проверка наличия actualEntryId (уже есть)
    if (!itemToUpdate.actualEntryId) {
      console.error("Cannot save reason for an item without an actual entry ID.");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${itemToUpdate.actualEntryId}`,
        { reason: tempReason },
        { headers: { 'x-auth-token': token } }
      );

      // Обновляем конкретный пункт в состоянии scheduleItems по definitionId
      setScheduleItems(scheduleItems.map(item =>
        item.definitionId === itemToUpdate.definitionId ? { ...item, reason: tempReason } : item
      ));
      setEditingReason(null);
      setTempReason('');
    } catch (err: any) {
      console.error('Error saving reason:', err.response?.data || err.message);
    }
  };

  const handleEditReason = (itemToEdit: DisplayScheduleItem) => {
    // Проверка наличия actualEntryId (уже есть)
    if (!itemToEdit.actualEntryId) {
      console.error("Cannot edit reason for an item without an actual entry ID.");
      return;
    }
    // Устанавливаем editingReason по actualEntryId (уже так работает)
    setEditingReason(itemToEdit.actualEntryId);
    setTempReason(itemToEdit.reason || '');
  };


  // Removed getScheduleItemForSelectedDay as its logic is merged into fetchScheduleItemsForDate
  // const getScheduleItemForSelectedDay = (description: string): ScheduleItem | undefined => { ... };


  return (
    <div className="h-screen overflow-y-auto content-wrapper-scrollbar bg-dark-bg text-gray-200">
      <div className="flex flex-col items-center p-4 pt-10 sm:p-8 sm:pt-16">
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 text-base sm:top-8 sm:left-8 sm:text-lg text-gray-400 hover:text-white transition duration-300 ease-in-out z-10"
        >
          Назад
        </button>
        <h1 className="text-5xl font-extrabold text-white mb-12 text-center">Чек-ин</h1>

        <div className="bg-dark-card shadow-lg rounded-xl p-8 mb-8 w-full max-w-3xl mx-auto border-2 border-gray-700 text-center" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
          <h2 className="text-3xl font-semibold text-white mb-6">Выбрать дату</h2>
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => date && setSelectedDate(startOfDay(date))}
            dateFormat="dd MMMM yyyy"
            locale={ru}
            className="mt-4 p-3 border rounded-md text-center bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-base w-full cursor-pointer hover:border-gray-500 custom-datepicker-input"
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-300 text-base">Загрузка данных для {format(selectedDate, 'dd MMMM', { locale: ru })}...</p>
        ) : scheduleItems.length === 0 ? (
          <div className="text-center text-gray-300 text-base">У вас пока нет пунктов расписания на {format(selectedDate, 'dd MMMM', { locale: ru })}.</div>
        ) : (
          <div className="space-y-2 w-full max-w-3xl mx-auto shadow-lg rounded-xl p-6 border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
            <ul className="space-y-3">
              {/* Iterate over the combined scheduleItems for display */}
              {scheduleItems.map((item) => {
                // Use item.status and item.reason directly from the combined item
                const status = item.status;
                const reason = item.reason;

                return (
                  <li key={item.definitionId} className="bg-gray-800 bg-opacity-50 p-3 rounded-lg flex flex-col border border-gray-700">
                    <div className="flex items-center">
                      <span className="text-gray-200 text-base font-medium overflow-wrap break-word flex-1 min-w-0">
                        {item.description}
                      </span>
                      <div className="flex space-x-2 ml-4">
                        <button
                          // Pass the entire display item to the toggle handler
                          onClick={() => handleCheckInToggle(item, 'completed')}
                          className={`px-3 py-1 rounded ${status === 'completed'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                            } text-white transition-colors duration-200`}
                        >
                          ✓
                        </button>
                        <button
                          // Pass the entire display item to the toggle handler
                          onClick={() => handleCheckInToggle(item, 'not_completed')}
                          className={`px-3 py-1 rounded ${status === 'not_completed'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                            } text-white transition-colors duration-200`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Show reason and edit button if status is 'not_completed' */}
                    {status === 'not_completed' && (
                      <div className="mt-2">
                        {/* Use actualEntryId to determine if editing reason for this item */}
                        {editingReason === item.actualEntryId ? (
                          <div className="flex flex-col space-y-2">
                            <input
                              type="text"
                              value={tempReason}
                              onChange={(e) => setTempReason(e.target.value)}
                              maxLength={100} // Keep max length as per previous change
                              placeholder="Введите причину (макс. 100 символов)"
                              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setEditingReason(null);
                                  setTempReason('');
                                }}
                                className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors duration-200"
                              >
                                Отмена
                              </button>
                              {/* Pass the item to handleSaveReason */}
                              <button
                                onClick={() => handleSaveReason(item)}
                                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            {reason && (
                              <p className="text-gray-300 text-sm italic">
                                Причина: {reason}
                              </p>
                            )}
                            {/* Show edit button only if there is an actual entry (status is not null) */}
                            {item.actualEntryId && (
                              <button
                                onClick={() => handleEditReason(item)} // Pass the item to handleEditReason
                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 self-start"
                              >
                                {reason ? 'Редактировать причину' : 'Добавить причину'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinPage;