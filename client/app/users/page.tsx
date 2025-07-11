// client/app/users/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
    _id: string;
    username: string;
}

const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    const fetchUsers = useCallback(async () => {
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
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/users`, {
                headers: { 'x-auth-token': token },
            });
            setUsers(res.data);
        } catch (err: any) {
            console.error('Error fetching users:', err.response?.data || err.message);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                localStorage.setItem('sessionExpired', 'true');
                router.push('/auth');
            } else {
                setError(err.response?.data?.msg || err.message || 'Failed to fetch users.');
            }
        } finally {
            setLoading(false);
        }
    }, [router, setError, setLoading, setUsers]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            localStorage.setItem('sessionExpired', 'true');
            router.push('/auth');
            setLoading(false);
            return;
        }

        fetchUsers();
    }, [router, fetchUsers]);

    if (loading) return (
        <div className="flex flex-col items-center min-h-screen bg-dark-bg text-gray-200 p-8 pt-16 text-center">
            <button
                onClick={() => router.back()}
                className="absolute top-8 left-8 text-gray-400 hover:text-white transition duration-300 ease-in-out text-lg"
            >
                Назад
            </button>
            Загрузка пользователей...
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
                    className="fixed top-4 left-4 text-base sm:top-8 sm:left-8 sm:text-lg text-gray-400 hover:text-white transition duration-300 ease-in-out"
                >
                    Назад
                </button>
                <h1 className="text-5xl font-extrabold text-white mb-12 text-center">Все пользователи</h1>

                {users.length === 0 ? (
                    <div className="text-center text-gray-300 text-base">Нет доступных пользователей.</div>
                ) : (
                    <div className="space-y-4 w-full max-w-lg mx-auto shadow-lg rounded-xl p-8 border-2 border-gray-700" style={{ background: 'radial-gradient(circle at top left, rgba(20, 25, 35, 1) 0%, rgba(5, 10, 20, 1) 100%)' }}>
                        <ul className="space-y-4">
                            {users.map(user => (
                                <li key={user._id} className="bg-gray-800 bg-opacity-50 p-4 rounded-lg flex items-center justify-between border border-gray-700 hover:bg-gray-700 transition duration-300 ease-in-out cursor-pointer">
                                    <Link href={`/users/${user._id}`} className="text-gray-200 hover:text-white text-lg font-medium transition duration-300 ease-in-out flex-grow">
                                        {user.username}
                                    </Link>
                                    <span className="text-gray-400 text-xl">&rarr;</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsersPage; 