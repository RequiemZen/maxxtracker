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

  useEffect(() => {
    // Fetch general schedule items once on mount
    fetchGeneralScheduleItems();
  }, []);

  useEffect(() => {
    // Fetch schedule items for the selected date
    fetchScheduleItemsForDate(selectedDate);
  }, [selectedDate]); // Refetch when selected date changes

  const fetchGeneralScheduleItems = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return setError('Authentication token not found.');

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/general-schedule`, {
        headers: { 'x-auth-token': token },
      });
      setGeneralScheduleItems(res.data);
    } catch (err: any) {
      console.error('Error fetching general schedule:', err.response?.data || err.message);
      setError(err.response?.data?.msg || err.message || 'Failed to fetch general schedule.');
    }
  };

  const fetchScheduleItemsForDate = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found.');
        setLoading(false);
        return;
      }

      // Construct the start and end of the selected day for filtering
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

      // Filter items to only include those for the exact selected day
      // (Backend might return items across the day boundary depending on timezone)
      const itemsForSelectedDay = res.data.filter((item: ScheduleItem) =>
        isSameDay(new Date(item.date), date)
      );

      setScheduleItems(itemsForSelectedDay);

    } catch (err: any) {
      console.error('Error fetching schedule items for date:', err.response?.data || err.message);
      setError(err.response?.data?.msg || err.message || 'Failed to fetch schedule items for date.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInToggle = async (generalItem: GeneralScheduleItem, desiredStatus: string | null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found.');
        return;
      }

      // Find the existing schedule item for this general item and selected date
      const existingScheduleItem = getScheduleItemForSelectedDay(generalItem.description);

      let newStatus: string | null = null; // null represents 'not marked'
      let updatedItem: ScheduleItem | undefined;

      if (existingScheduleItem) {
        // If item exists, determine the new status based on the desired status
        if (existingScheduleItem.status === desiredStatus) {
          // If clicking the currently active status, reset to not marked (delete)
          newStatus = null;
        } else {
          // If clicking a different status, update to that status
          newStatus = desiredStatus;
        }

        if (newStatus === null) {
          // If new status is null, delete the item
          await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${existingScheduleItem._id}`, { status: null }, {
            headers: { 'x-auth-token': token },
          });
          // Remove the item from local state
          setScheduleItems(scheduleItems.filter(item => item._id !== existingScheduleItem._id));
          console.log('Schedule item removed (status reset)');

        } else {
          // If new status is completed or not_completed, update the item
          const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${existingScheduleItem._id}`, { status: newStatus }, {
            headers: { 'x-auth-token': token },
          });
          updatedItem = res.data;

          // Update the item in local state
          setScheduleItems(scheduleItems.map(item => item._id === updatedItem?._id ? updatedItem : item));
          console.log('Schedule item updated:', updatedItem);
        }

      } else if (desiredStatus !== null) {
        // If item doesn't exist and a status is desired (completed or not_completed), create a new one
        newStatus = desiredStatus;
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule`, {
          date: selectedDate.toISOString(),
          description: generalItem.description,
          status: newStatus, // Use the new status
        }, {
          headers: { 'x-auth-token': token },
        });

        // Add the new item to the local state
        setScheduleItems([...scheduleItems, res.data]);
        console.log('Schedule item created:', res.data);
      } else {
        // If item doesn't exist and desiredStatus is null, do nothing
        console.log('Item not marked and desired status is null, no action needed.');
        setError(null); // Clear errors if any were set by previous actions
      }

      setError(null); // Clear errors on success

    } catch (err: any) {
      console.error('Error during check-in toggle:', err.response?.data || err.message);
      setError(err.response?.data?.msg || err.message || 'Failed to toggle check-in status.');
    }
  };

  // Helper to get the schedule item for a general item on the selected day
  const getScheduleItemForSelectedDay = (description: string): ScheduleItem | undefined => {
    return scheduleItems.find(item =>
      isSameDay(new Date(item.date), selectedDate) && item.description === description
    );
  };

  if (loading && generalScheduleItems.length === 0) return <div className="container mx-auto px-4 py-8 text-center text-gray-200 bg-dark-bg">Загрузка...</div>;
  if (error) return (
    <div className="flex flex-col items-center min-h-screen bg-dark-bg text-gray-200 p-8 pt-16">
      {/* Back Button */}
      <button
        onClick={() => router.back()} // Navigate back
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
    // Applied dark background and padding, added relative for back button positioning
    <div className="relative flex flex-col items-center min-h-screen bg-dark-bg text-gray-200 p-8 pt-16">

      {/* Back Button */}
      <button
        onClick={() => router.back()} // Navigate back
        className="absolute top-8 left-8 text-gray-400 hover:text-white transition duration-300 ease-in-out text-lg"
      >
        &larr; Назад
      </button>

      {/* Increased text size and margin for the title */}
      <h1 className="text-5xl font-extrabold text-white mb-12 text-center">Чек-ин</h1>

      {/* Restyled Date Picker container with gradient background and 2px border, increased max-w */}
      <div className="bg-dark-card shadow-lg rounded-xl p-8 mb-8 w-full max-w-3xl mx-auto border-2 border-gray-700 text-center" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
        {/* Increased text size and margin for the date title */}
        <h2 className="text-3xl font-semibold text-white mb-6">Выбрать дату</h2>
        {/* Date Picker - added hover effect to indicate interactivity */}
        <DatePicker
          selected={selectedDate}
          onChange={(date: Date | null) => date && setSelectedDate(startOfDay(date))}
          dateFormat="dd MMMM yyyy"
          locale={ru}
          // Restyled DatePicker input: changed background to a darker shade
          // Added custom class for potential further styling and attempted to remove outline/ring on focus
          className="mt-4 p-3 border rounded-md text-center bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-base w-full cursor-pointer hover:border-gray-500 custom-datepicker-input"
        />
      </div>

      {loading && generalScheduleItems.length > 0 ? (
        <p className="text-center text-gray-300 text-base">Загрузка данных для {format(selectedDate, 'dd MMMM', { locale: ru })}...</p>
      ) : generalScheduleItems.length === 0 ? (
        <div className="text-center text-gray-300 text-base">У вас нет пунктов в общем расписании. <a href="/setup" className="text-blue-400 hover:underline">Добавьте их здесь</a>.</div>
      ) : (
        <div className="space-y-4 w-full max-w-3xl mx-auto shadow-lg rounded-xl p-8 border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
          <ul className="space-y-4">
            {generalScheduleItems.map((generalItem) => {
              const scheduleItem = getScheduleItemForSelectedDay(generalItem.description);
              const status = scheduleItem?.status; // Get status, will be undefined/null if not marked

              return (
                <li key={generalItem._id} className="bg-gray-800 bg-opacity-50 p-4 rounded-lg flex items-center justify-between border border-gray-700">
                  <span className="text-gray-200 text-lg font-medium mr-4 flex-grow">{generalItem.description}</span>
                  <div className="flex items-center space-x-4"> {/* Adjusted space-x */}
                    {/* Completed Indicator (Checkmark) - Changed to square with rounded corners, updated colors and hover */}
                    <div
                      className={`w-10 h-10 flex items-center justify-center rounded-md border-2 cursor-pointer text-xl transition duration-300 ease-in-out
                        ${status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-500 text-gray-500 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white'}
                    `}
                      onClick={() => handleCheckInToggle(generalItem, 'completed')}
                    >
                      ✓
                    </div>

                    {/* Not Completed Indicator (Cross) - Changed to square with rounded corners, updated colors and hover */}
                    <div
                      className={`w-10 h-10 flex items-center justify-center rounded-md border-2 cursor-pointer text-xl transition duration-300 ease-in-out
                        ${status === 'not_completed' ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-gray-500 text-gray-500 hover:bg-rose-500 hover:border-rose-500 hover:text-white'}
                    `}
                      onClick={() => handleCheckInToggle(generalItem, 'not_completed')}
                    >
                      ✕
                    </div>

                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )
      }
    </div >
  );
};

export default CheckinPage;