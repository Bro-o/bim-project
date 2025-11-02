import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Criteria() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [message, setMessage] = useState('')
  const [convertedFile, setConvertedFile] = useState<Blob | null>(null)
  const [convertedFileName, setConvertedFileName] = useState<string>('')
  const [templateMessage, setTemplateMessage] = useState('')
  const [manualMessage, setManualMessage] = useState('')
  const [taskId, setTaskId] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setMessage('')
      // 새 파일 선택 시 이전 변환 결과 초기화
      setConvertedFile(null)
      setConvertedFileName('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    console.log('=== 변환 시작 ===')
    console.log('선택된 파일:', file)

    setIsUploading(true)
    setIsConverting(true)
    setMessage('Excel 파일 업로드 완료. 변환 작업을 시작합니다...')

    try {
      // FormData 생성
      const formData = new FormData()
      formData.append('excel_file', file)

      // 비동기 변환 요청 (task_id 수신)
      const kickResponse = await fetch('/api/excel-to-ids/', {
        method: 'POST',
        body: formData,
      })

      if (!kickResponse.ok) {
        throw new Error(`HTTP error! status: ${kickResponse.status}`)
      }

      const kickData = await kickResponse.json()
      if (!kickData?.task_id) {
        throw new Error(kickData?.error || '작업 ID를 받지 못했습니다.')
      }

      setTaskId(kickData.task_id)
      setMessage('변환 작업이 큐에 등록되었습니다. 작업 상태를 확인 중입니다...')

      // 폴링으로 작업 상태 확인
      const originalName = file.name.split('.')[0]
      const defaultName = `${originalName}_Specifications.ids`

      await new Promise<void>((resolve, reject) => {
        const start = Date.now()
        const timeoutMs = 5 * 60 * 1000 // 최대 5분 대기
        const interval = setInterval(async () => {
          try {
            // 타임아웃 처리
            if (Date.now() - start > timeoutMs) {
              clearInterval(interval)
              reject(new Error('작업 대기 시간이 초과되었습니다.'))
              return
            }

            const statusRes = await fetch(`/api/task-status/${kickData.task_id}/`)
            if (!statusRes.ok) return // 잠시 후 재시도
            const status = await statusRes.json()

            if (status.state === 'FAILURE') {
              clearInterval(interval)
              reject(new Error(status.error || '작업이 실패했습니다.'))
            } else if (status.state === 'SUCCESS') {
              clearInterval(interval)
              // 완료되면 결과 파일 다운로드 요청
              const dlRes = await fetch(`/api/download-result/${kickData.task_id}/`)
              if (!dlRes.ok) {
                reject(new Error(`결과 다운로드 오류: ${dlRes.status}`))
                return
              }
              const blob = await dlRes.blob()
              const name = status?.result?.filename || defaultName
              setConvertedFile(blob)
              setConvertedFileName(name)
              setMessage('IDS 파일 변환이 완료되었습니다! 다운로드 버튼을 클릭하여 파일을 받으세요.')
              setIsConverting(false)
              resolve()
            } else {
              // 진행 중 상태 메시지 갱신 (선택)
              setMessage('변환 중입니다... 잠시만 기다려 주세요.')
            }
          } catch (err) {
            clearInterval(interval)
            reject(err)
          }
        }, 2000)
      })
    } catch (error) {
      console.error('변환 오류:', error)
      setMessage(`변환 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      setIsConverting(false)
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      setTemplateMessage('Excel 템플릿을 다운로드합니다...')
      const response = await fetch(`/api/download/template/`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setTemplateMessage('Excel 템플릿 다운로드가 완료되었습니다!')
    } catch (error) {
      console.error('템플릿 다운로드 오류:', error)
      setTemplateMessage(`템플릿 다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const downloadManual = async () => {
    try {
      setManualMessage('작성 매뉴얼을 다운로드합니다...')
      const response = await fetch(`/api/download/manual/`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Manual.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setManualMessage('작성 매뉴얼 다운로드가 완료되었습니다!')
    } catch (error) {
      console.error('매뉴얼 다운로드 오류:', error)
      setManualMessage(`매뉴얼 다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const downloadConvertedFile = () => {
    if (convertedFile && convertedFileName) {
      // Blob을 다운로드 링크로 변환
      const url = window.URL.createObjectURL(convertedFile)
      const a = document.createElement('a')
      a.href = url
      a.download = convertedFileName
      document.body.appendChild(a)
      a.click()
      
      // 정리
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setMessage(`${convertedFileName} 파일을 다운로드했습니다.`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>기준 제시 - BIM 플랫폼</title>
      </Head>

      {/* 상단 네비게이션 바 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">개방형 BIM 기반 건축설계기준 검토 업무 지원 플랫폼</h1>
            <div className="flex space-x-4">
              <Link href="/criteria" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium">
                기준 제시 모듈
              </Link>
              <Link href="/application" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">기준 제시 모듈</h2>
            <p className="text-gray-600 leading-relaxed">
              기준 제시 모듈의 기능은 세 가지 입니다. 기능1은 'IDS 매핑 테이블 파일 다운로드', 
              기능 2는 'IDS 매핑 테이블 작성 매뉴얼 다운로드', 기능3은 '작성한 매핑테이블 파일을 업로드 하면 IDS 파일로 변환'입니다. 
              이용자께서 검토하고자 하는 건축설계기준을 IDS 파일로 작성해 건축실무자에게 제시해 주세요.
            </p>
          </div>

          {/* 관리자 제공 파일 다운로드 섹션 */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* IDS 매핑 테이블 템플릿 다운로드 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                IDS 매핑 테이블 파일 다운로드
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                IDS 매핑 테이블 작성에 필요한 엑셀 템플릿을 다운로드하세요.
              </p>
              <button
                onClick={downloadTemplate}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                IDS 매핑 테이블.xlsx 다운로드
              </button>
              {/* 템플릿 다운로드 메시지 */}
              {templateMessage && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 text-sm">{templateMessage}</p>
                </div>
              )}
            </div>

            {/* 작성 매뉴얼 다운로드 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                IDS 매핑 테이블 작성 매뉴얼 다운로드
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                매핑 테이블 작성 방법을 안내하는 매뉴얼을 다운로드하세요.
              </p>
              <button
                onClick={downloadManual}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                IDS 매핑 테이블 작성 매뉴얼.pdf 다운로드
              </button>
              {/* 매뉴얼 다운로드 메시지 */}
              {manualMessage && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-purple-800 text-sm">{manualMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* 파일 변환 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="bg-blue-900 text-white p-4 rounded-t-lg -m-8 mb-8">
              <h2 className="text-2xl font-bold text-center">
                '매핑 테이블.xlsx' to 'IDS' Converter
              </h2>
            </div>

            {/* 좌→우 변환 흐름 */}
            <div className="flex flex-col lg:flex-row items-center justify-between space-y-8 lg:space-y-0 lg:space-x-8">
              {/* 1. 파일 업로드 */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    IDS 매핑 테이블 엑셀 파일 업로드
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
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
                        여기에 작성한 'IDS 매핑 테이블.xlsx' 파일을 올려주세요
                      </p>
                      {file && (
                        <p className="text-sm text-blue-600 mt-2 font-medium">
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
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
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
                    IDS 파일 다운로드
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <div className="text-gray-500 mb-2">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {convertedFile ? '변환이 완료되었습니다!' : '변환이 완료되면 IDS 파일이 다운 됩니다.'}
                    </p>
                    {convertedFile ? (
                      <div className="space-y-2">
                        <p className="text-xs text-blue-600 font-medium">
                          {convertedFileName}
                        </p>
                        <button
                          onClick={downloadConvertedFile}
                          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          IDS 파일 다운로드
                        </button>
                      </div>
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

            {/* 메시지 표시 영역 */}
            {message && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-center">{message}</p>
              </div>
            )}

            {/* 변환 시작 버튼 */}
            <div className="mt-8 text-center">
              <button
                onClick={handleSubmit}
                disabled={!file || isUploading}
                className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                {isUploading ? '변환 중...' : '변환 시작'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}