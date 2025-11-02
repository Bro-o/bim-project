import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Application() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [message, setMessage] = useState('')
  const [convertedFile, setConvertedFile] = useState<Blob | null>(null)
  const [convertedFileName, setConvertedFileName] = useState<string>('')
  const [taskId, setTaskId] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setIsConverting(true)
    setMessage('파일 업로드 완료. 변환 작업을 시작합니다...')

    try {
      const formData = new FormData()
      formData.append('ids_file', file)

      // 비동기 변환 시작 (task_id 수신)
      const kickRes = await fetch('/api/ids-to-blender-addon/', {
        method: 'POST',
        body: formData,
      })

      if (!kickRes.ok) {
        throw new Error(`HTTP error! status: ${kickRes.status}`)
      }

      const kickData = await kickRes.json()
      if (!kickData?.task_id) {
        throw new Error(kickData?.error || '작업 ID를 받지 못했습니다.')
      }

      setTaskId(kickData.task_id)
      setMessage('변환 작업이 큐에 등록되었습니다. 상태를 확인 중입니다...')

      // 상태 폴링 후 완료 시 결과 다운로드
      await new Promise<void>((resolve, reject) => {
        const start = Date.now()
        const timeoutMs = 5 * 60 * 1000
        const interval = setInterval(async () => {
          try {
            if (Date.now() - start > timeoutMs) {
              clearInterval(interval)
              reject(new Error('작업 대기 시간이 초과되었습니다.'))
              return
            }

            const statusRes = await fetch(`/api/task-status/${kickData.task_id}/`)
            if (!statusRes.ok) return
            const status = await statusRes.json()

            if (status.state === 'FAILURE') {
              clearInterval(interval)
              reject(new Error(status.error || '작업이 실패했습니다.'))
            } else if (status.state === 'SUCCESS') {
              clearInterval(interval)
              const dlRes = await fetch(`/api/download-result/${kickData.task_id}/`)
              if (!dlRes.ok) {
                reject(new Error(`결과 다운로드 오류: ${dlRes.status}`))
                return
              }
              const blob = await dlRes.blob()
              const filename = status?.result?.filename || 'Blender_addon.zip'
              setConvertedFile(blob)
              setConvertedFileName(filename)
              setMessage('변환이 완료되었습니다! 아래 버튼을 눌러 ZIP 파일을 다운로드하세요.')
              setIsConverting(false)
              resolve()
            } else {
              setMessage('변환 중입니다... 잠시만 기다려 주세요.')
            }
          } catch (err) {
            clearInterval(interval)
            reject(err)
          }
        }, 2000)
      })
    } catch (error) {
      console.error('Error:', error)
      setMessage('변환 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      setIsConverting(false)
    }
  }

  const downloadConvertedFile = () => {
    if (convertedFile && convertedFileName) {
      const url = window.URL.createObjectURL(convertedFile)
      const a = document.createElement('a')
      a.href = url
      a.download = convertedFileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setMessage('ZIP 파일이 다운로드되었습니다!')
    } else {
      setMessage('다운로드할 파일이 없습니다. 먼저 변환을 완료하세요.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>기준 적용 - BIM 플랫폼</title>
      </Head>

      {/* 상단 네비게이션 바 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">개방형 BIM 기반 건축설계기준 검토 업무 지원 플랫폼</h1>
            <div className="flex space-x-4">
              <Link href="/criteria" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
                기준 제시 모듈
              </Link>
              <Link href="/application" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium">
                기준 적용 모듈
              </Link>
              <Link href="/review" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
                기준 검토 모듈
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 모듈 설명 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">기준 적용 모듈</h2>
            <p className="text-gray-600 leading-relaxed">
              기준 적용 모듈의 기능은 한 가지 입니다. 이용자께서 적용할 기준에 대한 IDS 파일을 업로드 하시면, 
              생성된 Blender Add-in 파일을 다운로드 할 수 있습니다. 이 Add-in의 기능은 BIM 모델링 시 적용할 기준에 대해 
              해당 객체 탐색 → 객체별 Pset 부여 → Property 속성값 자동 입력 기능을 사용할 수 있습니다.
            </p>
          </div>

          {/* 파일 변환 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="bg-blue-900 text-white p-4 rounded-t-lg -m-8 mb-8">
              <h2 className="text-2xl font-bold text-center">
                'IDS' to 'Blender Add-in' Converter
              </h2>
            </div>

            {/* 좌→우 변환 흐름 */}
            <div className="flex flex-col lg:flex-row items-center justify-between space-y-8 lg:space-y-0 lg:space-x-8">
              {/* 1. 파일 업로드 */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    IDS 파일 업로드
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".ids"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer block"
                    >
                      <div className="text-gray-500 mb-2">
                        <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">
                        여기에 IDS 파일을 올려주세요
                      </p>
                      {file && (
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          선택된 파일: {file.name}
                        </p>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. 변환 애니메이션 */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {isConverting ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
                  ) : (
                    <div className="flex space-x-2">
                      <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                      <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                      <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {isConverting ? '변환 중...' : '변환 대기'}
                </p>
              </div>

              {/* 3. 변환된 파일 다운로드 */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Blender 플러그인 다운로드
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <div className="text-gray-500 mb-2">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                    {convertedFile ? '변환이 완료되었습니다!' : '변환이 완료되면 ZIP 파일이 다운 됩니다.'}
                    </p>
                    {convertedFile ? (
                      <button
                        onClick={downloadConvertedFile}
                        className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Blender 플러그인 다운로드
                      </button>
                    ) : (
                      <button
                        disabled
                        className="bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed"
                      >
                        변환 대기 중
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 변환 시작 버튼 */}
            <div className="mt-8 text-center">
              <button
                onClick={handleSubmit}
                disabled={!file || isUploading}
                className="bg-green-600 text-white py-3 px-8 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                {isUploading ? '변환 중...' : '변환 시작'}
              </button>
            </div>

            {/* 메시지 표시 영역 */}
            {message && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-center">{message}</p>
              </div>
            )}
          </div>

          {/* PDF 가이드 다운로드 섹션 */}
          <div className="grid md:grid-cols-1 gap-6">
            {/* Blender Add-in 가이드 다운로드 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Blender Add-in 설치 및 사용 가이드 다운로드
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Blender Add-in 설치 및 사용 방법을 안내하는 가이드를 다운로드하세요.
              </p>
              <button
                onClick={() => setMessage('Blender Add-in 설치 및 사용 가이드를 다운로드합니다...')}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                Blender Add-in 설치 및 사용 가이드.pdf 다운로드
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
