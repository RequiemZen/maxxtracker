'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter, useParams } from 'next/navigation'; // Import useRouter and useParams

interface GeneralScheduleItem {
  _id: string;
  description: string;
  weekDays?: number[];
}

interface ScheduleItem {
  _id: string;
  user: string;
  description: string;
  date: string;
  status?: string;
  reason?: string;
  definitionId?: string;
}

interface TemporaryScheduleDefinition {
  _id: string;
  description: string;
  startDate: string;
  endDate: string;
  createdAt: string; // Assuming createdAt is also fetched
}

interface CombinedScheduleItem {
  _id: string; // Original _id from General or Temporary definition
  definitionId: string; // _id used for linking with ScheduleItem
  description: string;
  isTemporary: boolean;
  startDate?: string; // Only for temporary items
  endDate?: string; // Only for temporary items
  createdAt?: string; // Only for temporary items
  // Properties added after combining with actual entries
  status?: string; // From ScheduleItem
  reason?: string; // From ScheduleItem
  actualEntryId?: string; // ID of the associated ScheduleItem
}

const UserSchedulePage = () => {
  const params = useParams();
  const userId = params.userId as string; // Get userId from URL

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [generalScheduleItems, setGeneralScheduleItems] = useState<GeneralScheduleItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [temporaryScheduleDefinitions, setTemporaryScheduleDefinitions] = useState<TemporaryScheduleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('...'); // State to hold the target user's username

  const router = useRouter(); // Initialize useRouter

  const fetchGeneralScheduleItems = useCallback(async (id: string) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule/${id}`, {
        headers: { 'x-auth-token': token },
      });
      setGeneralScheduleItems(res.data);
    } catch (err: any) {
      console.error('Error fetching general schedule:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to fetch general schedule.');
      }
    }
  }, [router, setError, setGeneralScheduleItems]);

  const fetchTemporaryDefinitions = useCallback(async (id: string) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/temporary`, {
        headers: { 'x-auth-token': token },
        params: { userId: id }, // Pass the target user ID
      });
      setTemporaryScheduleDefinitions(res.data);
    } catch (err: any) {
      console.error('Error fetching temporary schedule definitions:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to fetch temporary schedule definitions.');
      }
    }
  }, [router, setError, setTemporaryScheduleDefinitions]);

  const fetchUsername = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
        return;
      }
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/users`, {
        headers: { 'x-auth-token': token },
      });
      const foundUser = res.data.find((user: { _id: string; username: string }) => user._id === id);
      if (foundUser) {
        setUsername(foundUser.username);
      } else {
        console.error('User with ID', id, 'not found in the fetched users list.');
        setUsername('Неизвестный пользователь');
      }
    } catch (err) {
      console.error('Error fetching username:', err);
      if (axios.isAxiosError(err) && err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setUsername('Неизвестный пользователь');
      }
    }
  }, [router, setUsername]);

  const fetchScheduleItemsForDate = useCallback(async (id: string, date: Date) => {
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

      // Calculate start and end of the selected day in UTC
      const startOfSelectedDayUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const endOfSelectedDayUTC = new Date(startOfSelectedDayUTC);
      endOfSelectedDayUTC.setDate(endOfSelectedDayUTC.getDate() + 1);

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule`, {
        headers: { 'x-auth-token': token },
        params: {
          userId: id,
          start_date: startOfSelectedDayUTC.toISOString(),
          end_date: endOfSelectedDayUTC.toISOString(),
        }
      });

      // The backend should now filter correctly based on UTC date ranges.
      // We can simply set the items as received.
      setScheduleItems(res.data.actualEntries || []); // Use actualEntries and provide empty array fallback

    } catch (err: any) {
      console.error('Error fetching schedule items for user:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.setItem('sessionExpired', 'true');
        router.push('/auth');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to fetch schedule items for user.');
      }
    } finally {
      setLoading(false);
    }
  }, [router, setError, setLoading, setScheduleItems]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !userId) {
      localStorage.setItem('sessionExpired', 'true');
      router.push('/auth');
      setLoading(false);
      return;
    }
    fetchGeneralScheduleItems(userId);
    fetchTemporaryDefinitions(userId);
    fetchUsername(userId);
  }, [userId, router, fetchGeneralScheduleItems, fetchTemporaryDefinitions, fetchUsername]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !userId) {
      localStorage.setItem('sessionExpired', 'true');
      router.push('/auth');
      setLoading(false);
      return;
    }
    fetchScheduleItemsForDate(userId, selectedDate);
  }, [userId, selectedDate, router, fetchScheduleItemsForDate]);

  // Combine general, active temporary items, and actual entries for display
  const itemsToDisplay = useCallback((): CombinedScheduleItem[] => {
    const selectedDateUTC = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));

    // Фильтруем общие пункты по дням недели
    const filteredGeneralItems = generalScheduleItems.filter(item => {
      // Если нет weekDays или он пустой — показываем на все дни
      if (!item.weekDays || item.weekDays.length === 0) return true;
      const dayOfWeek = selectedDate.getDay(); // 0 - воскресенье, 1 - понедельник, ...
      return item.weekDays.includes(dayOfWeek);
    });

    // Filter temporary definitions active on the selected date
    const activeTemporaryItems = temporaryScheduleDefinitions.filter(def => {
      const startDateUTC = new Date(def.startDate);
      const endDateUTC = new Date(def.endDate);
      // Check if the selected date is within the temporary item's date range (inclusive)
      return selectedDateUTC >= new Date(Date.UTC(startDateUTC.getUTCFullYear(), startDateUTC.getUTCMonth(), startDateUTC.getUTCDate())) &&
        selectedDateUTC <= new Date(Date.UTC(endDateUTC.getUTCFullYear(), endDateUTC.getUTCMonth(), endDateUTC.getUTCDate()));
    });

    // Map actual entries for quick lookup by definitionId and date
    const actualEntriesMap = new Map<string, ScheduleItem>();
    scheduleItems.forEach(entry => {
      // Use definitionId as part of the key
      actualEntriesMap.set(`${entry.definitionId}_${new Date(entry.date).toISOString().split('T')[0]}`, entry);
    });

    // Combine filtered general and active temporary items, linking with actual entries
    const combinedItems: CombinedScheduleItem[] = [
      ...filteredGeneralItems.map(item => ({
        ...item,
        definitionId: item._id, // Use _id as definitionId for general items
        isTemporary: false,
      })),
      ...activeTemporaryItems.map(item => ({
        ...item,
        definitionId: item._id, // Use _id as definitionId for temporary definitions
        isTemporary: true,
        createdAt: item.createdAt, // Include createdAt for temporary items
      })),
    ];

    // Sort items: general first, then temporary by createdAt (or other relevant field)
    combinedItems.sort((a, b) => {
      if (a.isTemporary && !b.isTemporary) return 1;
      if (!a.isTemporary && b.isTemporary) return -1;
      // For items of the same type, sort by description or another field if needed
      // For temporary items, maybe sort by startDate or createdAt?
      if (a.isTemporary && b.isTemporary) {
        // If both are temporary, sort by createdAt
        const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aCreatedAt - bCreatedAt;
      }
      // This part should not be reached if items are only general or temporary
      return 0; // Should not happen
    });

    // Augment combined items with status and reason from actual entries
    const displayItems: CombinedScheduleItem[] = combinedItems.map(item => {
      const entryKey = `${item.definitionId}_${selectedDateUTC.toISOString().split('T')[0]}`;
      const actualEntry = actualEntriesMap.get(entryKey);
      return {
        ...item,
        status: actualEntry?.status,
        reason: actualEntry?.reason,
        actualEntryId: actualEntry?._id, // Keep track of the actual entry ID if it exists
      };
    });

    return displayItems;
  }, [selectedDate, generalScheduleItems, temporaryScheduleDefinitions, scheduleItems]);

  if (loading && generalScheduleItems.length === 0) return (
    <div className="flex flex-col items-center min-h-screen bg-dark-bg text-gray-200 p-8 pt-16 text-center">
      <button onClick={() => router.back()} className="absolute top-8 left-8 text-gray-400 hover:text-white transition duration-300 ease-in-out text-lg">
        Назад
      </button>
      Загрузка данных пользователя...
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center min-h-screen bg-dark-bg text-gray-200 p-8 pt-16">
      <button
        onClick={() => router.back()}
        className="absolute top-8 left-8 text-gray-400 hover:text-white transition duration-300 ease-in-out text-lg"
      >
        Назад
      </button>
      <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-6 py-4 rounded-md relative mb-8 w-full max-w-3xl text-center">
        <span className="block sm:inline">Ошибка: {error}</span>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-y-auto content-wrapper-scrollbar bg-dark-bg text-gray-200">
      <div className="flex flex-col items-center p-4 pt-10 sm:p-8 sm:pt-16">
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 text-base sm:top-8 sm:left-8 sm:text-lg text-gray-400 hover:text-white transition duration-300 ease-in-out z-10"
        >
          Назад
        </button>

        <h1 className="text-5xl font-extrabold text-white mb-12 text-center">Расписание {username}</h1>

        <div className="bg-dark-card shadow-lg rounded-xl p-8 mb-8 w-full max-w-3xl mx-auto border-2 border-gray-700 text-center" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
          <h2 className="text-3xl font-semibold text-white mb-6">Выбрать дату</h2>
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => date && setSelectedDate(startOfDay(date))}
            dateFormat="dd MMMM yyyy"
            locale={ru}
            className="mt-4 p-3 border rounded-md text-center bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-base w-full cursor-pointer hover:border-gray-500"
          />
        </div>

        {loading && generalScheduleItems.length > 0 ? (
          <p className="text-center text-gray-300 text-base">Загрузка данных для {format(selectedDate, 'dd MMMM', { locale: ru })}...</p>
        ) : generalScheduleItems.length === 0 ? (
          <div className="text-center text-gray-300 text-base">У пользователя нет пунктов в общем расписании.</div>
        ) : (
          <div className="space-y-2 w-full max-w-3xl mx-auto shadow-lg rounded-xl p-6 border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
            <ul className="space-y-3">
              {itemsToDisplay().map((item) => {
                const status = item.status;

                return (
                  <li key={item.definitionId} className="bg-gray-800 bg-opacity-50 p-3 rounded-lg flex flex-col border border-gray-700">
                    <div className="flex items-center">
                      <span className="text-gray-200 text-base font-medium overflow-wrap break-word flex-1 min-w-0">
                        {item.description}
                      </span>
                      <div className="flex items-center space-x-2 ml-4">
                        <div
                          className={`w-8 h-8 flex items-center justify-center rounded-md text-sm
                          ${status === 'completed' ? 'bg-green-600 text-white'
                              : status === 'not_completed' ? 'bg-red-600 text-white'
                                : 'bg-gray-600 text-white'}
                    `}
                        >
                          {status === 'completed' && '✓'}
                          {status === 'not_completed' && '✕'}
                          {status === undefined || status === null ? '—' : null}
                        </div>
                      </div>
                    </div>

                    {status === 'not_completed' && item.reason && (
                      <div className="mt-2">
                        <p className="text-gray-300 text-sm italic">
                          Причина: {item.reason}
                        </p>
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

export default UserSchedulePage; 