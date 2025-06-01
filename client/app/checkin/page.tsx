// client/app/checkin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import DatePicker from 'react-datepicker'; // Import DatePicker
import 'react-datepicker/dist/react-datepicker.css'; // Import DatePicker styles
import { useRouter } from 'next/navigation'; // Import useRouter

interface GeneralScheduleItem {
  _id: string;
  description: string;
}

interface ScheduleItem {
  _id: string;
  user: string;
  description: string;
  date: string; // Date will be string from backend
  status?: string; // Changed from isCompleted: boolean
}

const CheckinPage = () => {
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date())); // Default to today
  const [generalScheduleItems, setGeneralScheduleItems] = useState<GeneralScheduleItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]); // Completed items for selected date
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter(); // Initialize useRouter

  const fetchGeneralScheduleItems = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth?sessionExpired=true');
        return;
      }
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`, {
        headers: { 'x-auth-token': token },
      });
      setGeneralScheduleItems(res.data);
    } catch (err: any) {
      console.error('Error fetching general schedule:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        router.push('/auth?sessionExpired=true');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to fetch general schedule.');
      }
    }
  };

  const fetchScheduleItemsForDate = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth?sessionExpired=true');
        setLoading(false);
        return;
      }

      const startOfSelectedDay = startOfDay(date);
      const endOfSelectedDay = new Date(startOfSelectedDay);
      endOfSelectedDay.setDate(endOfSelectedDay.getDate() + 1);

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule`, {
        headers: { 'x-auth-token': token },
        params: {
          start_date: startOfSelectedDay.toISOString(),
          end_date: endOfSelectedDay.toISOString(),
        }
      });

      const itemsForSelectedDay = res.data.filter((item: ScheduleItem) =>
        isSameDay(new Date(item.date), date)
      );

      setScheduleItems(itemsForSelectedDay);

    } catch (err: any) {
      console.error('Error fetching schedule items for date:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        router.push('/auth?sessionExpired=true');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to fetch schedule items for date.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth?sessionExpired=true');
      setLoading(false);
      return;
    }
    fetchGeneralScheduleItems();
  }, [router, fetchGeneralScheduleItems]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth?sessionExpired=true');
      setLoading(false);
      return;
    }
    fetchScheduleItemsForDate(selectedDate);
  }, [selectedDate, router, fetchScheduleItemsForDate]);

  const handleCheckInToggle = async (generalItem: GeneralScheduleItem, desiredStatus: string | null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth?sessionExpired=true');
        return;
      }

      const existingScheduleItem = getScheduleItemForSelectedDay(generalItem.description);

      let newStatus: string | null = null;
      let updatedItem: ScheduleItem | undefined;

      if (existingScheduleItem) {
        if (existingScheduleItem.status === desiredStatus) {
          newStatus = null;
        } else {
          newStatus = desiredStatus;
        }

        if (newStatus === null) {
          await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${existingScheduleItem._id}`, { status: null }, {
            headers: { 'x-auth-token': token },
          });
          setScheduleItems(scheduleItems.filter(item => item._id !== existingScheduleItem._id));
          console.log('Schedule item removed (status reset)');

        } else {
          const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${existingScheduleItem._id}`, { status: newStatus }, {
            headers: { 'x-auth-token': token },
          });
          updatedItem = res.data;

          setScheduleItems(scheduleItems.map(item => item._id === updatedItem?._id ? updatedItem : item));
          console.log('Schedule item updated:', updatedItem);
        }

      } else if (desiredStatus !== null) {
        newStatus = desiredStatus;
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule`, {
          date: selectedDate.toISOString(),
          description: generalItem.description,
          status: newStatus,
        }, {
          headers: { 'x-auth-token': token },
        });

        setScheduleItems([...scheduleItems, res.data]);
        console.log('Schedule item created:', res.data);
      } else {
        console.log('Item not marked and desired status is null, no action needed.');
        setError(null);
      }

      setError(null);

    } catch (err: any) {
      console.error('Error during check-in toggle:', err.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        router.push('/auth?sessionExpired=true');
      } else {
        setError(err.response?.data?.msg || err.message || 'Failed to toggle check-in status.');
      }
    }
  };

  const getScheduleItemForSelectedDay = (description: string): ScheduleItem | undefined => {
    return scheduleItems.find(item =>
      isSameDay(new Date(item.date), selectedDate) && item.description === description
    );
  };

  if (loading && generalScheduleItems.length === 0) return <div className="container mx-auto px-4 py-8 text-center text-gray-200 bg-dark-bg">Загрузка...</div>;
  if (error) return (
    <div className="flex flex-col items-center min-h-screen bg-dark-bg text-gray-200 p-8 pt-16">
      <button
        onClick={() => router.back()}
        className="absolute top-8 left-8 text-gray-400 hover:text-white transition duration-300 ease-in-out text-lg"
      >
        &larr; Назад
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
          className="fixed top-4 left-4 text-base sm:top-8 sm:left-8 sm:text-lg text-gray-400 hover:text-white transition duration-300 ease-in-out"
        >
          &larr; Назад
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

        {loading && generalScheduleItems.length > 0 ? (
          <p className="text-center text-gray-300 text-base">Загрузка данных для {format(selectedDate, 'dd MMMM', { locale: ru })}...</p>
        ) : generalScheduleItems.length === 0 ? (
          <div className="text-center text-gray-300 text-base">У вас нет пунктов в общем расписании. <a href="/setup" className="text-blue-400 hover:underline">Добавьте их здесь</a>.</div>
        ) : (
          <div className="space-y-2 w-full max-w-3xl mx-auto shadow-lg rounded-xl p-6 border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
            <ul className="space-y-3">
              {generalScheduleItems.map((item) => {
                const scheduleItem = getScheduleItemForSelectedDay(item.description);
                const status = scheduleItem?.status; // Can be 'completed', 'skipped', 'cancelled', or undefined/null

                return (
                  <li key={item._id} className="bg-gray-800 bg-opacity-50 p-3 rounded-lg flex items-center border border-gray-700">
                    <span className="text-gray-200 text-base font-medium break-all whitespace-normal flex-1 min-w-0">
                      {item.description}
                    </span>
                    <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-md border-2 cursor-pointer text-sm transition duration-300 ease-in-out
                          ${status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-gray-500 text-gray-500 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white'}
                    `}
                        onClick={() => handleCheckInToggle(item, 'completed')}
                      >
                        ✓
                      </div>

                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-md border-2 cursor-pointer text-sm transition duration-300 ease-in-out
                          ${status === 'not_completed' ? 'bg-rose-500 border-rose-500 text-white'
                            : 'border-gray-500 text-gray-500 hover:bg-rose-500 hover:border-rose-500 hover:text-white'}
                    `}
                        onClick={() => handleCheckInToggle(item, 'not_completed')}
                      >
                        ✕
                      </div>

                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinPage;