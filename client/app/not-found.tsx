import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg text-gray-200 p-4 text-center">
      <h2 className="text-4xl font-bold text-white mb-4">Страница не найдена</h2>
      <p className="text-lg text-gray-400 mb-8">К сожалению, мы не смогли найти запрошенную страницу.</p>
      <Link href="/" className="px-6 py-3 text-white font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 transition duration-300 ease-in-out">
        Вернуться на главную
      </Link>
    </div>
  )
} 