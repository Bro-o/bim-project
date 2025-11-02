import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'


export default function IFCTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  
  // IFC 로더와 fragments를 ref로 관리하여 외부에서 접근 가능하게 함
  const ifcLoaderRef = useRef<any>(null);
  const fragmentsRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행되도록 체크
    if (!isMounted || typeof window === 'undefined' || !containerRef.current) return;


    const initialize3D = async () => {
      // 동적으로 라이브러리들을 임포트하고 전역 변수에 할당
      const THREE = (await import("three"));
      const Stats = (await import("stats.js")).default;
      const BUI = await import("@thatopen/ui");
      const OBC = await import("@thatopen/components");

      const container = containerRef.current!;

      /* MD
        ### 🚀 Creating a components instance
        ---

        Now we will create a new instance of the `Components` class. This class is the main entry point of the library. It will be used to register and manage all the components in your application.

        :::tip Don't forget to dispose it when you are done!

        Once you are done with your application, you need to dispose the `Components` instance to free up the memory. This is a requirement of Three.js, which can't dispose the memory of 3D related elements automatically.

        :::

      */

      const components = new OBC.Components();

      const worlds = components.get(OBC.Worlds);

      const world = worlds.create<
        OBC.SimpleScene,
        OBC.SimpleCamera,
        OBC.SimpleRenderer
      >();


      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      world.scene.three.background = null;

      world.renderer = new OBC.SimpleRenderer(components, container);
      world.camera = new OBC.SimpleCamera(components);
      // await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

      components.init();

      components.get(OBC.Grids).create(world);

      

      /* MD
        ### 💄 Adding things to our scene
        ---

        Now we are ready to start adding some 3D entities to our scene. We will load a Fragments model:

      */

      const ifcLoader = components.get(OBC.IfcLoader);
      ifcLoaderRef.current = ifcLoader; // ref에 저장

      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: {
          path: "https://unpkg.com/web-ifc@0.0.71/",
          absolute: true,
        },
      });

      // 워커 파일 로드(localhost에서는 접근이 안돼서 다운 받아서 사용)
      const githubUrl =
        "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      const fetchedUrl = await fetch(githubUrl);
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], "worker.mjs", {
        type: "text/javascript",
      });
      const workerUrl = URL.createObjectURL(workerFile);

      const fragments = components.get(OBC.FragmentsManager);
      fragmentsRef.current = fragments; // ref에 저장
      fragments.init(workerUrl);

      world.camera.controls.addEventListener("rest", () =>
        fragments.core.update(true),
      );

      fragments.list.onItemSet.add(({ value: model }: any) => {
        model.useCamera(world.camera.three);
        world.scene.three.add(model.object);
        fragments.core.update(true);
      });


      /* MD
        ### ⏱️ Measuring the performance (optional)
        ---

        We'll use the [Stats.js](https://github.com/mrdoob/stats.js) to measure the performance of our app. We will add it to the top left corner of the viewport. This way, we'll make sure that the memory consumption and the FPS of our app are under control.

      */

      const stats = new Stats();
      stats.showPanel(2); // 메모리 패널 표시
      container.appendChild(stats.dom);
      
      // Stats.js 스타일링 - 컨테이너 기준으로 위치 설정
      stats.dom.style.position = "absolute";
      stats.dom.style.top = "10px";
      stats.dom.style.left = "10px";
      stats.dom.style.zIndex = "1000";
      stats.dom.style.margin = "0";
      
      world.renderer.onBeforeUpdate.add(() => stats.begin());
      world.renderer.onAfterUpdate.add(() => stats.end());


      // Cleanup function 반환
      return () => {
        components.dispose();
        // window.removeEventListener('resize', handleResize);
        // if (panel.parentNode) container.removeChild(panel);
        // if (button.parentNode) container.removeChild(button);
        if (stats.dom.parentNode) container.removeChild(stats.dom);
      };
    };

    // 3D 초기화 함수 호출
    let cleanup: (() => void) | undefined;
    
    initialize3D().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    // Cleanup function for useEffect
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isMounted]);

  // 파일 업로드 핸들러
  const handleFileUpload = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // IFC 파일 확장자 체크
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      alert('IFC 파일만 업로드 가능합니다.');
      return;
    }

    if (!ifcLoaderRef.current) {
      alert('3D 뷰어가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('IFC 파일 로딩 시작:', file.name);

      // 파일을 ArrayBuffer로 읽기
      const data = await file.arrayBuffer();
      const buffer = new Uint8Array(data);

      // IFC 로더를 사용하여 파일 로드
      await ifcLoaderRef.current.load(buffer, false, file.name, {
        processData: {
          progressCallback: (progress: number) => {
            console.log('로딩 진행률:', Math.round(progress * 100) + '%');
          },
        },
      });

      setLoadedFileName(file.name);
      console.log('IFC 파일 로딩 완료:', file.name);
    } catch (error) {
      console.error('IFC 파일 로딩 실패:', error);
      alert('IFC 파일을 로드하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      // 파일 input 초기화 (같은 파일을 다시 선택할 수 있도록)
      event.target.value = '';
    }
  };

  if (!isMounted) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-800 text-white text-lg font-medium">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div>3D 뷰어 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>IFC Test - 3D Viewer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
              <Link href="/review" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
                기준 검토 모듈
              </Link>
              <Link href="/ifc-test" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium">
                IFC 뷰어 테스트
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* 모듈 설명 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">IFC 뷰어 테스트</h2>
            <p className="text-gray-600 leading-relaxed">
              ThatOpen Components를 사용한 IFC 3D 뷰어 테스트 페이지입니다. 
              오른쪽 상단의 컨트롤 패널을 통해 배경색과 조명 설정을 조정할 수 있습니다.
            </p>
          </div>

          {/* 파일 업로드 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">IFC 파일 업로드</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                파일 선택
                <input
                  type="file"
                  accept=".ifc"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">파일 로딩 중...</span>
                </div>
              )}
              {loadedFileName && !isLoading && (
                <div className="flex items-center space-x-2 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{loadedFileName}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              * .ifc 파일만 업로드 가능합니다.
            </p>
          </div>

          {/* 3D 뷰어 박스 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">3D 모델 뷰어</h3>
            <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <div 
                className="w-full h-full relative" 
                ref={containerRef}
                style={{ minHeight: '600px' }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}