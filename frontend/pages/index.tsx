import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>BIM 건축설계기준 검토 플랫폼</title>
        <meta name="description" content="BIM 기반 건축설계기준 검토 업무 지원 플랫폼" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            BIM 건축설계기준 검토 플랫폼
          </h1>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Link href="/criteria" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">기준 제시</h2>
                <p className="text-gray-600">Excel 파일을 IDS 파일로 변환</p>
              </div>
            </Link>
            
            <Link href="/application" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">기준 적용</h2>
                <p className="text-gray-600">IDS 파일을 Blender 플러그인으로 변환</p>
              </div>
            </Link>
            
            <Link href="/review" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">기준 검토</h2>
                <p className="text-gray-600">IFC 파일 비교 및 검토</p>
              </div>
            </Link>

            <Link href="/ifc-test" className="block">
              <div className="bg-blue-50 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-blue-200">
                <h2 className="text-xl font-semibold text-blue-800 mb-4">IFC 뷰어 테스트</h2>
                <p className="text-blue-600">ThatOpen Components를 사용한 IFC 3D 뷰어</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
