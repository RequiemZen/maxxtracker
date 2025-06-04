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

const CheckinPage = () => {
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  // scheduleItems state will now hold the combined list for display on selectedDate
  const [scheduleItems, setScheduleItems] = useState<DisplayScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReason, setEditingReason] = useState<string | null>(null);
  const [tempReason, setTempReason] = useState<string>('');

  const router = useRouter();

  const fetchScheduleItemsForDate = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        setLoading(false);
        return;
      }

      const startOfSelectedDayUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const endOfSelectedDayUTC = new Date(startOfSelectedDayUTC);
      endOfSelectedDayUTC.setDate(endOfSelectedDayUTC.getDate() + 1);

      // 1. Fetch ALL General Schedule Items for the user (to maintain order)
      const generalItemsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`, {
        headers: { 'x-auth-token': token },
        // Assuming general-schedule endpoint is secured and returns items for authenticated user
        // If fetching for another user, add params: { userId: targetUserId }
      });
      const generalItems: GeneralScheduleItem[] = generalItemsRes.data;

      // 2. Fetch ALL Temporary Schedule Item Definitions for the user
      const temporaryDefsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/temporary`, {
        headers: { 'x-auth-token': token },
        // Assuming schedule/temporary GET endpoint is secured and returns items for authenticated user
        // If fetching for another user, add params: { userId: targetUserId }
      });
      const temporaryDefinitions: TemporaryScheduleDefinition[] = temporaryDefsRes.data;

      // 3. Fetch Actual Schedule Item Entries (check-ins) for the user on the selected date
      const actualEntriesRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule`, {
        headers: { 'x-auth-token': token },
        params: {
          start_date: startOfSelectedDayUTC.toISOString(),
          end_date: endOfSelectedDayUTC.toISOString(),
        }
      });
      const { actualEntries } = actualEntriesRes.data; // Извлекаем actualEntries из ответа

      // Combine and format the results for display
      const itemsToDisplay: DisplayScheduleItem[] = [];
      // Используем Map для сопоставления actualEntries по definitionId
      const actualEntriesMap = new Map<string, ActualScheduleEntry>();

      actualEntries.forEach((entry: ActualScheduleEntry) => {
        // Используем definitionId в качестве ключа
        actualEntriesMap.set(entry.definitionId, entry);
      });

      // Добавляем General Schedule Items в список отображения
      generalItems.forEach(item => {
        const actualEntry = actualEntriesMap.get(item._id); // Ищем запись по definitionId
        itemsToDisplay.push({
          definitionId: item._id,
          description: item.description,
          isTemporary: false,
          status: actualEntry?.status,
          reason: actualEntry?.reason,
          actualEntryId: actualEntry?._id,
        });
      });

      // Добавляем Temporary Schedule Items, активные на выбранную дату
      temporaryDefinitions.forEach(def => {
        const defStartDateUTC = new Date(def.startDate);
        const defEndDateUTC = new Date(def.endDate);

        // Проверяем, попадает ли выбранная дата в диапазон (включая конечную дату)
        if (startOfSelectedDayUTC >= defStartDateUTC && startOfSelectedDayUTC <= defEndDateUTC) {
          const actualEntry = actualEntriesMap.get(def._id); // Ищем запись по definitionId
          itemsToDisplay.push({
            definitionId: def._id,
            description: def.description,
            isTemporary: true,
            status: actualEntry?.status,
            reason: actualEntry?.reason,
            actualEntryId: actualEntry?._id,
          });
        }
      });

      // Теперь список itemsToDisplay содержит все пункты (общие и временные),
      // активные на выбранную дату, с присоединенными данными из actualEntries.
      // Они добавлены в порядке: сначала общие, затем временные по дате создания.
      // Если нужны другие порядки сортировки, их нужно применить здесь.

      setScheduleItems(itemsToDisplay);

    } catch (err: any) {
      console.error('Error fetching schedule items for date:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      }
    } finally {
      setLoading(false);
    }
  }, [router, setLoading, setScheduleItems]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('sessionExpired', 'true');
      router.push('/auth');
      setLoading(false);
      return;
    }
    fetchScheduleItemsForDate(selectedDate);
  }, [selectedDate, router, fetchScheduleItemsForDate]);


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