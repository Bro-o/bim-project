import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'


export default function IFCTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

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
      await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

      components.init();

      components.get(OBC.Grids).create(world);

      

      /* MD
        ### 💄 Adding things to our scene
        ---

        Now we are ready to start adding some 3D entities to our scene. We will load a Fragments model:

      */

      const initializeFragments = async () => {
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
        fragments.init(workerUrl);

        world.camera.controls.addEventListener("rest", () =>
          fragments.core.update(true),
        );

        fragments.list.onItemSet.add(({ value: model }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          fragments.core.update(true);
        });

        const fragPaths = ["https://thatopen.github.io/engine_components/resources/frags/school_arq.frag"];
        await Promise.all(
          fragPaths.map(async (path) => {
            const modelId = path.split("/").pop()?.split(".").shift();
            if (!modelId) return null;
            const file = await fetch(path);
            const buffer = await file.arrayBuffer();
            return fragments.core.load(buffer, { modelId });
          }),
        );

        /* MD
          Finally, we will make the camera look at the model:
        */

        
        await fragments.core.update(true);
      };

      // fragments 초기화 실행
      await initializeFragments();

      /* MD
        ### 🧩 Adding some UI
        ---

        We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:

      */

      BUI.Manager.init();

      /* MD
        Now we will create a new panel with some inputs to change the background color of the scene and the intensity of the directional and ambient lights. For more information about the UI library, you can check the specific documentation for it!
      */
      
      const panel = BUI.Component.create<BUI.PanelSection>(() => {
        return BUI.html`
          <bim-panel label="🎮 3D 뷰어 컨트롤" class="options-menu">
            <bim-panel-section label="🎨 화면 설정">
            
              <bim-color-input 
                label="배경색" color="#202932" 
                @input="${({ target }: { target: BUI.ColorInput }) => {
                  world.scene.config.backgroundColor = new THREE.Color(target.color);
                }}">
              </bim-color-input>
              
            </bim-panel-section>
            
            <bim-panel-section label="💡 조명 설정">
              
              <bim-number-input 
                slider step="0.1" label="방향광 강도" value="1.5" min="0.1" max="10"
                @change="${({ target }: { target: BUI.NumberInput }) => {
                  if (world && world.scene && world.scene.config && world.scene.config.directionalLight) {
                    world.scene.config.directionalLight.intensity = target.value;
                  }
                }}">
              </bim-number-input>
              
              <bim-number-input 
                slider step="0.1" label="환경광 강도" value="1" min="0.1" max="5"
                @change="${({ target }: { target: BUI.NumberInput }) => {
                  if (world && world.scene && world.scene.config && world.scene.config.ambientLight) {
                    world.scene.config.ambientLight.intensity = target.value;
                  }
                }}">
              </bim-number-input>
              
            </bim-panel-section>
          </bim-panel>
          `;
      });

      // 패널을 3D 렌더링 컨테이너 안으로 이동
      container.appendChild(panel);
      
      // 패널에 직접 스타일 적용 (BUI 컴포넌트는 Shadow DOM을 사용하므로 직접 적용 필요)
      setTimeout(() => {
        panel.style.position = "absolute";
        panel.style.top = "10px";
        panel.style.right = "10px";
        panel.style.maxHeight = "calc(100% - 10px)";
        panel.style.minWidth = "unset";
        panel.style.zIndex = "10";
        
        // BUI 컴포넌트 내부의 .parent 요소에도 스타일 적용
        const parentElement = panel.shadowRoot?.querySelector('.parent');
        if (parentElement) {
          parentElement.style.background = "white";
          parentElement.style.borderRadius = "12px";
          parentElement.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.15)";
          parentElement.style.padding = "24px";
          parentElement.style.minWidth = "200px";
          parentElement.style.maxWidth = "420px";
        }
      }, 100);

      /* MD
        And we will make some logic that adds a button to the screen when the user is visiting our app from their phone, allowing to show or hide the menu. Otherwise, the menu would make the app unusable.
      */

      const button = BUI.Component.create<BUI.PanelSection>(() => {
        return BUI.html`
            <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
              @click="${() => {
                if (panel.style.visibility === "hidden") {
                  panel.style.visibility = "visible";
                } else {
                  panel.style.visibility = "hidden";
                }
              }}"
              title="설정 메뉴">
            </bim-button>
          `;
      });

      // 버튼을 3D 렌더링 컨테이너 안으로 이동
      container.appendChild(button);
      
      // 버튼에 직접 스타일 적용
      setTimeout(() => {
        button.style.position = "absolute";
        button.style.top = "5px";
        button.style.right = "5px";
        button.style.zIndex = "10000";
        button.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
        button.style.color = "white";
        button.style.border = "none";
        button.style.borderRadius = "50%";
        button.style.width = "36px";
        button.style.height = "36px";
        button.style.cursor = "pointer";
        button.style.display = "none"; // 데스크톱에서는 숨김
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.style.fontSize = "24px";
        button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.3)";
        button.style.transition = "all 0.3s ease";
        button.style.visibility = "hidden";
        
        // 모바일 반응형 스타일 적용
        const checkMobile = () => {
          if (window.innerWidth <= 480) {
            // 모바일에서는 패널 숨기고 버튼 보이기
            panel.style.visibility = "hidden";
            panel.style.bottom = "5px";
            panel.style.left = "5px";
            panel.style.top = "auto";
            panel.style.right = "auto";
            button.style.visibility = "visible";
            button.style.display = "flex";
          } else {
            // 데스크톱에서는 패널 보이고 버튼 숨기기
            panel.style.visibility = "visible";
            panel.style.bottom = "auto";
            panel.style.left = "auto";
            panel.style.top = "5px";
            panel.style.right = "5px";
            button.style.visibility = "hidden";
            button.style.display = "none";
          }
        };
        
        // 초기 체크
        checkMobile();
        
        // 윈도우 리사이즈 이벤트 리스너
        window.addEventListener('resize', checkMobile);
        
        // cleanup 함수에 리스너 제거 추가
        const originalCleanup = cleanup;
        cleanup = () => {
          if (originalCleanup) originalCleanup();
          window.removeEventListener('resize', checkMobile);
        };
      }, 100);

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
        window.removeEventListener('resize', handleResize);
        if (panel.parentNode) container.removeChild(panel);
        if (button.parentNode) container.removeChild(button);
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