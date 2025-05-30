import UserScheduleClient from './userScheduleClient';
import axios from 'axios';

// Переименовали UserSchedulePage в ServerUserSchedulePage, но по сути это просто page.tsx
// Оставляем только generateStaticParams и рендерим Клиентский Компонент

interface UserSchedulePageProps {
  params: { userId: string };
}

// Функция generateStaticParams теперь определена и экспортируется прямо здесь
export async function generateStaticParams() {
  try {
    const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/users`);
    const users = res.data;
    return users.map((user: { _id: string }) => ({
      userId: user._id,
    }));
  } catch (error) {
    console.error('Error generating static params for users:', error);
    throw new Error('Failed to fetch users for static params generation.');
  }
}

const UserSchedulePage = ({ params }: UserSchedulePageProps) => {
  return <UserScheduleClient userId={params.userId} />;
};

export default UserSchedulePage; 