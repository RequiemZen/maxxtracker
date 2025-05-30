import { generateStaticParams } from './userScheduleClient';
import UserScheduleClient from './userScheduleClient';

// Переименовали UserSchedulePage в ServerUserSchedulePage, но по сути это просто page.tsx
// Оставляем только generateStaticParams и рендерим Клиентский Компонент

export { generateStaticParams };

interface UserSchedulePageProps {
  params: { userId: string };
}

const UserSchedulePage = ({ params }: UserSchedulePageProps) => {
  return <UserScheduleClient userId={params.userId} />;
};

export default UserSchedulePage; 