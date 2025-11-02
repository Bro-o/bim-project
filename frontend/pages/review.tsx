import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Review() {
  const [bimFile, setBimFile] = useState<File | null>(null)
  const [idsFile, setIdsFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [message, setMessage] = useState('')
  const [reviewResult, setReviewResult] = useState<any>(null)
  const [expandedEntities, setExpandedEntities] = useState<{[key: string]: boolean}>({})
  const [taskId, setTaskId] = useState<string>('')

  const handleBimFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBimFile(e.target.files[0])
      setMessage('')
    }
  }

  const handleIdsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdsFile(e.target.files[0])
      setMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bimFile || !idsFile) return

    setIsUploading(true)
    setIsReviewing(true)
    setMessage('파일 업로드 완료. 검토 작업을 시작합니다...')

    try {
      const formData = new FormData()
      formData.append('ifc_file', bimFile)
      formData.append('ids_file', idsFile)

      // 비동기 검토 시작 (task_id 수신)
      const kickRes = await fetch(`/api/ifc-ids-review/`, {
        method: 'POST',
        body: formData,
      })

      if (!kickRes.ok) {
        const errorData = await kickRes.json()
        throw new Error(errorData.error || `HTTP error! status: ${kickRes.status}`)
      }

      const kickData = await kickRes.json()
      if (!kickData?.task_id) {
        throw new Error(kickData?.error || '작업 ID를 받지 못했습니다.')
      }

      setTaskId(kickData.task_id)
      setMessage('검토 작업이 큐에 등록되었습니다. 상태를 확인 중입니다...')

      // 상태 폴링 후 완료 시 결과 구성
      await new Promise<void>((resolve, reject) => {
        const start = Date.now()
        const timeoutMs = 15 * 60 * 1000 // 검토는 더 오래 걸릴 수 있음
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
              const result = status.result

              setReviewResult({
                success: result?.success,
                summary: result?.summary,
                // HTML 리포트는 파일로 저장되므로 링크 안내
                htmlReportPath: result?.html_report_path,
                jsonReport: result?.json_report,
                details: result?.json_report?.specifications || []
              })

              setMessage('검토가 완료되었습니다! 결과를 확인하세요.')
              setIsReviewing(false)
              resolve()
            } else {
              setMessage('검토 중입니다... 잠시만 기다려 주세요.')
            }
          } catch (err) {
            clearInterval(interval)
            reject(err)
          }
        }, 2000)
      })
    } catch (error) {
      console.error('검토 오류:', error)
      setMessage(`검토 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      setIsReviewing(false)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadHtmlReport = () => {
    if (!reviewResult?.htmlReportPath) return
    const link = document.createElement('a')
    link.href = reviewResult.htmlReportPath.replace(/^.*\/media\//, '/media/')
    link.download = reviewResult.htmlReportPath.split('/').pop() || 'review_report.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleEntities = (key: string) => {
    setExpandedEntities(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>기준 검토 - BIM 플랫폼</title>
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
              <Link href="/application" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
                기준 적용 모듈
              </Link>
              <Link href="/review" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium">
                기준 검토 모듈
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* 모듈 설명 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">기준 검토 모듈</h2>
            <p className="text-gray-600 leading-relaxed">
              기준 검토 모듈의 기능은 한 가지 입니다. 이용자께서 검토 대상 건축물의 BIM파일과 검토할 건축설계기준의 IDS 파일을 업로드하세요. 
              업로드가 완료되면, "기준 검토 실행" 버튼을 눌러주세요. 검토가 완료되면 검토 결과가 오른쪽에 표시됩니다.
            </p>
          </div>

          {/* 메인 검토 인터페이스 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 파일 업로드 및 실행 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">파일 업로드</h3>
                {/* BIM 파일 업로드 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BIM 파일 업로드
                  </label>
                  <p className="text-xs text-gray-500 mb-3">검토 대상 건축물 BIM 파일 (IFC 또는 Fragments)</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".ifc"
                      onChange={handleBimFileChange}
                      className="hidden"
                      id="bim-file-upload"
                    />
                    <label
                      htmlFor="bim-file-upload"
                      className="cursor-pointer block text-center"
                    >
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-sm text-gray-600">BIM 파일 선택</p>
                      <p className="text-xs text-gray-500 mt-1">.ifc 파일 지원</p>
                      {bimFile && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">{bimFile.name}</p>
                      )}
                    </label>
                  </div>
                </div>
                {/* IDS 파일 업로드 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IDS 파일 업로드
                  </label>
                  <p className="text-xs text-gray-500 mb-3">검토할 건축설계기준 IDS파일</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".ids"
                      onChange={handleIdsFileChange}
                      className="hidden"
                      id="ids-file-upload"
                    />
                    <label
                      htmlFor="ids-file-upload"
                      className="cursor-pointer block text-center"
                    >
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-sm text-gray-600">IDS 파일 선택</p>
                      {idsFile && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">{idsFile.name}</p>
                      )}
                    </label>
                  </div>
                </div>
                {/* 검토 실행 버튼 */}
                <button
                  onClick={handleSubmit}
                  disabled={!bimFile || !idsFile || isUploading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isUploading ? '검토 중...' : '기준 검토 실행'}
                </button>
                {/* 메시지 표시 */}
                {message && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-800 text-sm">{message}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽: 검토 결과 */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-6 h-full">
                {/* 검토 결과 */}
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">검토 결과</h3>
                    {reviewResult?.htmlReportPath && (
                      <button
                        onClick={handleDownloadHtmlReport}
                        className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        HTML 리포트 다운로드
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col h-full">
                    {reviewResult ? (
                      <>
                        {/* 고정된 요약 통계 */}
                        {reviewResult.summary && (
                          <div className="flex-shrink-0 space-y-4 mb-6">
                            {/* 전체 통계 */}
                            <div className="grid grid-cols-4 gap-2">
                              <div className="text-center p-3 bg-green-50 rounded-lg border">
                                <div className="text-xl font-bold text-green-600">{reviewResult.summary.passed || 0}</div>
                                <div className="text-xs text-green-600">통과</div>
                                <div className="text-xs text-gray-500">{reviewResult.summary.percent_specifications_pass || 0}%</div>
                              </div>
                              <div className="text-center p-3 bg-red-50 rounded-lg border">
                                <div className="text-xl font-bold text-red-600">{reviewResult.summary.failed || 0}</div>
                                <div className="text-xs text-red-600">실패</div>
                                <div className="text-xs text-gray-500">{100 - (reviewResult.summary.percent_specifications_pass || 0)}%</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg border">
                                <div className="text-xl font-bold text-gray-600">{reviewResult.summary.skipped || 0}</div>
                                <div className="text-xs text-gray-600">해당 없음</div>
                                <div className="text-xs text-gray-500">N/A</div>
                              </div>
                              <div className="text-center p-3 bg-blue-50 rounded-lg border">
                                <div className="text-xl font-bold text-blue-600">{reviewResult.summary.total_specifications || 0}</div>
                                <div className="text-xs text-blue-600">전체</div>
                                <div className="text-xs text-gray-500">Specifications</div>
                              </div>
                            </div>
                            {/* 상세 통계 */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg_GRAY-50 p-3 rounded-lg">
                                <div className="font-semibold text-gray-700 mb-2">Requirements</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>전체:</span>
                                    <span className="font-medium">{reviewResult.summary.total_requirements || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>통과:</span>
                                    <span className="text-green-600 font-medium">{reviewResult.summary.passed_requirements || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>실패:</span>
                                    <span className="text-red-600 font-medium">{reviewResult.summary.failed_requirements || 0}</span>
                                  </div>
                                  <div className="flex justify_between">
                                    <span>해당 없음:</span>
                                    <span className="text-gray-600 font-medium">{reviewResult.summary.skipped_requirements || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>성공률:</span>
                                    <span className="font-medium">{reviewResult.summary.percent_requirements_pass || 0}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="font-semibold text-gray-700 mb-2">Checks</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>전체:</span>
                                    <span className="font-medium">{reviewResult.summary.total_checks || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>통과:</span>
                                    <span className="text-green-600 font-medium">{reviewResult.summary.passed_checks || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>실패:</span>
                                    <span className="text-red-600 font-medium">{reviewResult.summary.failed_checks || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>해당 없음:</span>
                                    <span className="text-gray-600 font-medium">{reviewResult.summary.skipped_checks || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>성공률:</span>
                                    <span className="font-medium">{reviewResult.summary.percent_checks_pass || 0}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 상세 결과 */}
                        {reviewResult.details && reviewResult.details.length > 0 ? (
                          <div className="flex-1 overflow-hidden">
                            <h4 className="font-semibold text-gray-800 mb-4">Specification 상세 결과</h4>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {reviewResult.details.map((spec: any, specIndex: number) => (
                              <div key={specIndex} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-gray-800">{spec.name || `Specification ${specIndex + 1}`}</h5>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      spec.total_applicable === 0 || spec.status === 'skipped'
                                        ? 'bg-gray-100 text-gray-600'
                                        : spec.status === true 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                    }`}>
                                      {spec.total_applicable === 0 || spec.status === 'skipped'
                                        ? '해당 없음' 
                                        : spec.status === true 
                                          ? '통과' 
                                          : '실패'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {spec.percent_applicable_pass || 0}% ({spec.total_applicable_pass || 0}/{spec.total_applicable || 0})
                                    </span>
                                  </div>
                                </div>
                                {spec.description && (
                                  <p className="text-sm text-gray-600 mb-3">{spec.description}</p>
                                )}
                                {spec.applicability && spec.applicability.length > 0 && (
                                  <div className="mb-3">
                                    <h6 className="text-sm font-medium text-gray-700 mb-1">적용 대상:</h6>
                                    <ul className="text-sm text-gray-600 ml-4">
                                      {spec.applicability.map((app: string, appIndex: number) => (
                                        <li key={appIndex} className="list-disc">{app}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {spec.requirements && spec.requirements.length > 0 && (
                                  <div className="space-y-2">
                                    <h6 className="text-sm font-medium text-gray-700">Requirements:</h6>
                                    {spec.requirements.map((req: any, reqIndex: number) => (
                                      <div key={reqIndex} className="ml-4 p-3 bg-gray-50 rounded border">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium">{req.label || `Requirement ${reqIndex + 1}`}</span>
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            req.total_applicable === 0 || req.status === 'skipped'
                                              ? 'bg-gray-100 text-gray-600'
                                              : req.status === true 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                          }`}>
                                            {req.total_applicable === 0 || req.status === 'skipped'
                                              ? '해당 없음' 
                                              : req.status === true 
                                                ? '통과' 
                                                : '실패'}
                                          </span>
                                        </div>
                                        {req.description && (
                                          <p className="text-xs text-gray-600 mb-2">{req.description}</p>
                                        )}
                                        <div className="text-xs text-gray-500 mb-2">
                                          성공률: {req.percent_pass || 0}% ({req.total_pass || 0}/{req.total_applicable || 0})
                                        </div>
                                        {req.total_applicable > 0 && (
                                          req.passed_entities && req.passed_entities.length > 0 ? (
                                            <div className="mt-2">
                                              <button
                                                onClick={() => toggleEntities(`passed_${specIndex}_${reqIndex}`)}
                                                className="flex items-center text-xs font-medium text-green-700 mb-1 hover:text-green-800"
                                              >
                                                성공한 요소들 ({req.passed_entities.length}개)
                                                <svg 
                                                  className={`w-3 h-3 ml-1 transition-transform ${expandedEntities[`passed_${specIndex}_${reqIndex}`] ? 'rotate-180' : ''}`} 
                                                  fill="none" 
                                                  stroke="currentColor" 
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                              </button>
                                              {expandedEntities[`passed_${specIndex}_${reqIndex}`] && (
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                  {req.passed_entities.map((entity: any, entityIndex: number) => (
                                                    <div key={entityIndex} className="text-xs bg-green-50 p-2 rounded">
                                                      <div className="font-medium">{entity.name || entity.class}</div>
                                                      {entity.reason && (
                                                        <div className="text-green-600 mt-1">{entity.reason}</div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="mt-2">
                                              <div className="text-xs font-medium text-gray-500 mb-1">성공한 요소들: 없음</div>
                                            </div>
                                          )
                                        )}
                                        {req.total_applicable > 0 && (
                                          req.failed_entities && req.failed_entities.length > 0 ? (
                                            <div className="mt-2">
                                              <button
                                                onClick={() => toggleEntities(`failed_${specIndex}_${reqIndex}`)}
                                                className="flex items-center text-xs font-medium text-red-700 mb-1 hover:text-red-800"
                                              >
                                                실패한 요소들 ({req.failed_entities.length}개)
                                                <svg 
                                                  className={`w-3 h-3 ml-1 transition-transform ${expandedEntities[`failed_${specIndex}_${reqIndex}`] ? 'rotate-180' : ''}`} 
                                                  fill="none" 
                                                  stroke="currentColor" 
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                              </button>
                                              {expandedEntities[`failed_${specIndex}_${reqIndex}`] && (
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                  {req.failed_entities.map((entity: any, entityIndex: number) => (
                                                    <div key={entityIndex} className="text-xs bg-red-50 p-2 rounded">
                                                      <div className="font-medium">{entity.name || entity.class}</div>
                                                      {entity.reason && (
                                                        <div className="text-red-600 mt-1">{entity.reason}</div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="mt-2">
                                              <div className="text-xs font-medium text-gray-500 mb-1">실패한 요소들: 없음</div>
                                            </div>
                                          )
                                        )}
                                        {req.total_applicable === 0 && (
                                          <div className="mt-2">
                                            <div className="text-xs font-medium text-gray-400 mb-1">적용 가능한 요소가 없음</div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <p>검증 결과가 없습니다.</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm">검토 결과가 여기에 표시됩니다</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
