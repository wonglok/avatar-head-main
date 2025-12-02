'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { ssgi } from 'three/examples/jsm/tsl/display/SSGINode.js'
import { ssr } from 'three/examples/jsm/tsl/display/SSRNode.js'
import { traa } from 'three/examples/jsm/tsl/display/TRAANode.js'

import {
    pass,
    mrt,
    output,
    normalView,
    metalness,
    roughness,
    diffuseColor,
    velocity,
    vec2,
    vec4,
    add,
    directionToColor,
    colorToDirection,
    sample,
    blendColor,

    emissive,

    // Fn,
    // positionWorld,
    // mx_fractal_noise_vec3,
    // vertexColor,

    vec3,
    Fn,
    uniform,
    If,
    select,
    bool,
    float,
    texture,
    uv,
    textureCubeUV,
    cubeTexture,
    equirectUV,
    positionViewDirection,
    positionWorldDirection,
    positionView,

    // uniform,
    // float,
    // uv,
    // color,
    // smoothstep,
    // mix,
    // texture,
    // cubeToUV,
} from 'three/tsl'
import { Object3D, } from 'three/webgpu'
// import { Mesh } from 'three/webgpu'
// import { DoubleSide } from 'three/webgpu'
// import { CubeCamera } from 'three/webgpu'
import { Color, Scene } from 'three/webgpu'
// import { MeshStandardMaterial } from 'three/webgpu'
// import { WebGLCubeRenderTarget } from 'three/webgpu'
import { EquirectangularReflectionMapping, PostProcessing, UnsignedByteType } from 'three/webgpu'
import { rgbeLoader, useTSL } from './CanvasTSL'
import { AmbientLight } from 'three/webgpu'
import { DirectionalLight } from 'three/webgpu'
import { PCFSoftShadowMap } from 'three/webgpu'

import { ClockIcon, PauseCircleIcon, PlayCircleIcon, LightbulbIcon, PlayIcon, StopCircleIcon, TimerIcon } from 'lucide-react'

import { Clock } from 'three'
import { create } from 'zustand'
import gsap from 'gsap'

//
export const getZustand = () => {
    return create(() => {
        return {
            //
            isScreenMotion: false,
            //
            giIntensity: 25,
            readyRender: true,
            timeOfDay: 1,
            lighting: null,
            isAnimatingLight: true,
            setModelLights: (v) => { },
            render: 'basic',
        };
    })
}

export class SunlightObject extends Object3D {
    static configureShadow({ renderer }) {
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = PCFSoftShadowMap
    }

    /**
     * @property {THREE.WebGLRenderer} renderer The Three.js renderer to enable shadows on.
     * @property {THREE.Object3D} [targetObject=new THREE.Object3D()] An object for the sun to always face.
     */
    constructor({
        targetObject = new Object3D(),
        scene,
        renderer
    }) {
        super()

        // const rttCube = new WebGLCubeRenderTarget(64)

        // const rttScene = new Scene()

        // const cubeCam = new CubeCamera(0.5, 25, rttCube)
        // cubeCam.update(renderer, rttScene)

        // scene.backgroundNode = cubeTexture(rttCube.texture)
        // scene.backgroundIntensity = 0.75

        // scene.environmentNode = cubeTexture(rttCube.texture)

        // const envMat = new MeshStandardMaterial({
        //     side: DoubleSide,
        //     color: new Color('#000000'),
        //     map: null,
        //     emissive: new Color('#ffffff'),
        //     emissiveIntensity: 1.0,
        // })
        // envMat.needsUpdate = true

        // envMat.userData.updateRender = () => {
        //     // cubeCam.update(renderer, rttScene)
        // }


        const applyBackground = (tex) => {
            // rttScene.needsPMREMUpdate = true
            // rttScene.needsUpdate = true

            scene.backgroundNode = texture(tex, uv())
            scene.backgroundIntensity = 0.75

            scene.environmentNode = texture(tex, uv())

            scene.needsUpdate = true
            scene.needsPMREMUpdate = true

            // cubeCam.update(renderer, rttScene)

            // envMat.emissive = new Color('#ffffff')
            // envMat.emissiveMap = texture(tex)
            // envMat.needsUpdate = true

            // envMat.userData.updateRender()
        }


        // const sphe = new Mesh(new SphereGeometry(1, 32, 32), envMat)
        // rttScene.add(sphe)
        // envMat.userData.updateRender()

        this.loadHDR = (url = `/hdr/poly_haven_studio_1k.hdr`) => {
            //
            //
            rgbeLoader.loadAsync(`${url}`).then((texture) => {
                texture.mapping = EquirectangularReflectionMapping
                texture.needsUpdate = true
                texture.flipY = true

                applyBackground(texture)
                this.update(0.5)
            })
        }

        // this.envMat = envMat

        this.scene = scene

        this.warmColor = new Color('#b55f09')
        this.whiteColor = new Color('#ffffff')
        this.blackColor = new Color('#07242c')

        this.target = targetObject

        this.sunLight = new DirectionalLight(0xffffff, 1.5)
        this.sunLight.castShadow = true

        this.add(this.sunLight)
        this.add(this.sunLight.target)

        this.sunLight.castShadow = true
        this.sunLight.shadow.camera.near = 0
        this.sunLight.shadow.camera.far = 150 * 2

        this.sunLight.shadow.camera.left = -15 * 10
        this.sunLight.shadow.camera.right = 15 * 10
        this.sunLight.shadow.camera.bottom = -15 * 10
        this.sunLight.shadow.camera.top = 15 * 10

        this.sunLight.shadow.mapSize.width = 2048
        this.sunLight.shadow.mapSize.height = 2048
        this.sunLight.shadow.radius = 1
        this.sunLight.shadow.bias = -0.00035

        this.sunLight.shadow.intensity = 0.75
        this.sunLight.intensity = 1.0

        this.ambLight = new AmbientLight(0xffffff, 0.0)

        this.add(this.ambLight)

        this.lastMotion = 0
    }

    update(dayProgress = 0) {
        let leftRight = (dayProgress * 2.0 - 1.0) * -1.0
        let v010 = 1.0 - Math.abs(dayProgress * 2.0 - 1.0)
        let orig010 = v010
        // v010 = Math.pow(v010, 0.5)
        // v010 = Math.min(v010, 1.0)

        const radius = 100
        const x = radius * leftRight
        const y = radius * v010
        const z = v010 * 12.5

        this.sunLight.position.set(x, y, z)

        this.sunLight.target.position.copy(this.target.position)
        this.sunLight.color.lerpColors(this.warmColor, this.whiteColor, orig010)

        let latestMotion = Math.pow(v010, 0.25)
        latestMotion = Math.min(1, latestMotion)
        latestMotion *= 1.0

        if (latestMotion !== this.lastMotion) {
            this.lastMotion = latestMotion

            this.scene.backgroundIntensity = v010 * 0.75
            // env lighting //  
            this.scene.environmentIntensity = latestMotion * 0.15
            this.ambLight.intensity = (1.0 - latestMotion) * 0.05


            // shadow
            this.sunLight.shadow.intensity = ((1.0 - latestMotion) * 0.7 + 0.3) * 1.0

            // light beams
            this.sunLight.intensity = ((latestMotion)) * 3


            // //
            // this.envMat.emissiveIntensity = v010
            // this.envMat.userData.updateRender()



            this.scene.traverse((it) => {

                let withinCollider = false
                it.traverseAncestors((sit) => {
                    if (sit?.userData.isEnv) {
                        if (!withinCollider) {
                            withinCollider = true
                        }
                    }
                })

                if (withinCollider) {
                    let root = it

                    root.traverse((it) => {
                        if (it.userData.isLight) {
                            it.intensity = (v010) * 150
                        }
                        if (it?.material) {
                            it.material.emissiveIntensity = 10 * (v010)
                        }
                    })

                }

            })


            // rootEnv.forEach(it => {

            // })
        }

    }
}

export function EffectsSSGI() {
    let useLighting = useTSL()
    let gl = useThree((r) => r.gl)
    let scene = useThree((r) => r.scene)
    let camera = useThree((r) => r.camera)

    //

    useEffect(() => {
        //
        if (process.env.NODE_ENV === 'development') {
            let stats = new Stats()
            stats.dom.style.position = 'absolute'
            stats.dom.style.touchAction = 'none'
            stats.dom.style.top = ''
            stats.dom.style.left = ''
            stats.dom.style.right = '0px'
            stats.dom.style.bottom = '0px'

            gl.domElement.parentElement.parentElement.appendChild(stats.dom)
            let rr = () => {
                stats.update()
                requestAnimationFrame(rr)
            }
            requestAnimationFrame(rr)

            return () => {
                gl.domElement.parentElement.parentElement.removeChild(stats.dom)
            }
        }
    }, [])


    useEffect(() => {
        let postProcessing = new PostProcessing(gl)

        const scenePass = pass(scene, camera)

        scenePass.setMRT(
            mrt({
                output: output,
                // emissive: emissive,
                diffuseColor: diffuseColor,
                normal: directionToColor(normalView),
                metalrough: vec2(metalness, roughness), // pack metalness and roughness into a single attachment
                velocity: velocity,
            }),
        )

        const scenePassColor = scenePass.getTextureNode('output')
        // const scenePassEmissive = scenePass.getTextureNode('emissive')
        const scenePassDiffuse = scenePass.getTextureNode('diffuseColor')
        const scenePassDepth = scenePass.getTextureNode('depth')
        const scenePassNormal = scenePass.getTextureNode('normal')
        const scenePassMetalRough = scenePass.getTextureNode('metalrough')
        const scenePassVelocity = scenePass.getTextureNode('velocity')

        const diffuseTexture = scenePass.getTexture('diffuseColor')
        diffuseTexture.type = UnsignedByteType

        const normalTexture = scenePass.getTexture('normal')
        normalTexture.type = UnsignedByteType

        const metalRoughTexture = scenePass.getTexture('metalrough')
        metalRoughTexture.type = UnsignedByteType

        const sceneNormal = sample((uv) => colorToDirection(scenePassNormal.sample(uv)))

        const giPass = ssgi(scenePassColor, scenePassDepth, sceneNormal, camera)

        // giPass.sliceCount.value = 1;
        // giPass.stepCount.value = 10;
        // giPass.aoIntensity.value = 1.0;
        // giPass.giIntensity.value = 25.0;
        // giPass.radius.value = 12;
        // giPass.backfaceLighting.value = 0.01;
        // giPass.expFactor.value = 3;

        giPass.sliceCount.value = 1
        giPass.stepCount.value = 12

        giPass.aoIntensity.value = 1.5
        giPass.giIntensity.value = 25.0

        giPass.radius.value = 50
        giPass.backfaceLighting.value = 0.25
        giPass.expFactor.value = 3

        giPass.useScreenSpaceSampling.value = true
        giPass.useTemporalFiltering = true

        //
        const ssrPass = ssr(
            scenePassColor,
            scenePassDepth,
            sceneNormal,
            scenePassMetalRough.r,
            scenePassMetalRough.g,
            camera,
        )

        const gi = (giPass).rgb
        const ao = (giPass).a

        // const gi = vec3(1.0)
        // const ao = float(1.0)

        const bloomPass = bloom(scenePassColor, 10.0, 1.0, 0.9)

        // apply AO to scene color and add GI multiplied by diffuse color
        const sceneWithGI = vec4(
            add(scenePassColor.rgb.mul(ao), scenePassDiffuse.rgb.mul(gi)).mul(bloomPass.rgb.mul(1).add(1)),
            scenePassColor.a,
        )

        const composite = blendColor(sceneWithGI, ssrPass)

        const giColor = traa(composite, scenePassDepth, scenePassVelocity, camera)


        let render = useLighting.getState().render
        postProcessing.outputNode = render === 'raytrace' ? giColor : scenePassColor
        postProcessing.needsUpdate = true

        let cancelSubs = useLighting.subscribe((a, b) => {
            if (a.render !== b.render) {
                if (a.render === 'raytrace') {
                    postProcessing.outputNode = giColor
                    postProcessing.needsUpdate = true
                } else {
                    postProcessing.outputNode = scenePassColor
                    postProcessing.needsUpdate = true
                }
            }
        })



        let cancelRunning = useLighting.subscribe((now, before) => {
            if (now.isScreenMotion !== before.isScreenMotion) {

                console.log('now.isScreenMotion', now.isScreenMotion)
                if (now.isScreenMotion) {
                    giPass.sliceCount.value = 1
                    giPass.stepCount.value = 12

                    // giPass.aoIntensity.value = 1.5
                    // giPass.giIntensity.value = 25.0

                    gsap.to(giPass.aoIntensity, {
                        value: 0.0,
                        duration: 0.5,
                    }).play()
                    gsap.to(giPass.giIntensity, {
                        value: 0.0,
                        duration: 0.5,
                    }).play()

                    giPass.radius.value = 50
                    giPass.backfaceLighting.value = 0.25
                    giPass.expFactor.value = 3

                    giPass.useScreenSpaceSampling.value = true
                    giPass.useTemporalFiltering = true
                } else {
                    giPass.sliceCount.value = 1
                    giPass.stepCount.value = 12

                    // giPass.aoIntensity.value = 0
                    // giPass.giIntensity.value = 0

                    gsap.to(giPass.aoIntensity, {
                        value: 2.0,
                        duration: 0.5,
                    }).play()
                    gsap.to(giPass.giIntensity, {
                        value: 35.0,
                        duration: 0.5,
                    }).play()


                    giPass.radius.value = 50
                    giPass.backfaceLighting.value = 0.25
                    giPass.expFactor.value = 3

                    giPass.useScreenSpaceSampling.value = true
                    giPass.useTemporalFiltering = true
                }
            }
        })



        console.log(gl)
        let frame = 0
        let hh = () => {
            frame = requestAnimationFrame(hh)
            if (gl.initialized) {
                try {
                    postProcessing?.render()
                } catch (e) {
                    console.log(e)
                }
            }

        }
        frame = requestAnimationFrame(hh)

        return () => {
            cancelSubs();
            cancelRunning()
            cancelAnimationFrame(frame)
            postProcessing.dispose()
        }
    }, [])

    useFrame(() => {
    }, 150)

    return <></>
}

export function EnvLight({ hdrURL = `` }) {
    let useLighting = useTSL()
    let gl = useThree((r) => r.gl)

    let scene = useThree((r) => r.scene)

    let lighting = useLighting(r => r.lighting)

    let timeOfDay = useLighting((r) => r.timeOfDay)

    useEffect(() => {
        let cleanLighting = () => { }

        let setupLighting = async () => {
            let lighting = new SunlightObject({
                targetObject: new Object3D(),
                scene: scene,
                renderer: gl
            })

            useLighting.setState({
                lighting: lighting,
            })

            cleanLighting = () => {
                lighting.removeFromParent()
                useLighting.setState({
                    lighting: false,
                })
            }

            scene.add(lighting)
        }

        setupLighting()

        return () => {
            cleanLighting()
        }
    }, [])

    useEffect(() => {
        if (lighting && hdrURL) {
            lighting.loadHDR(`${hdrURL}`)
        }
    }, [lighting, hdrURL])

    useEffect(() => {
        timeOfDay = Number(timeOfDay)
        if (lighting && typeof timeOfDay === 'number') {
            lighting.update(timeOfDay || 0)
        }

        return () => {
        }
    }, [lighting, timeOfDay])

    return null
}

export function EffectContorls() {
    let useLighting = useTSL()
    let timeOfDay = useLighting(r => r.timeOfDay)

    let refTimer = useRef(0)
    let isAnimatingLight = useLighting(r => r.isAnimatingLight)
    useEffect(() => {
        if (isAnimatingLight) {
            cancelAnimationFrame(refTimer.current)
        } else {
            cancelAnimationFrame(refTimer.current)
            return
        }

        let ck = new Clock()
        let vv = () => {
            refTimer.current = requestAnimationFrame(vv)

            let dt = ck.getDelta()

            let timeOfDay = useLighting.getState().timeOfDay

            timeOfDay += dt / 10

            timeOfDay %= 1

            useLighting.setState({
                timeOfDay: timeOfDay
            })

        }
        refTimer.current = requestAnimationFrame(vv)

        return () => {
            cancelAnimationFrame(refTimer.current)
        }
    }, [isAnimatingLight])


    return <>
        {<div className=' text-black mb-4 bg-white px-1 py-1 rounded-3xl'>
            {<>
                {<div className='flex'>
                    <span>
                        <ClockIcon></ClockIcon>
                    </span>

                    <input
                        className='ml-2 w-[200px] lg:w-[300px]'
                        type='range'
                        min={0}
                        max={1}
                        step={0.01}
                        value={timeOfDay}
                        onChange={(ev) => {
                            //
                            cancelAnimationFrame(refTimer.current)

                            //
                            useLighting.setState({
                                timeOfDay: ev.target.value
                            })
                            useLighting.setState({
                                isAnimatingLight: false
                            })
                        }}
                    />

                    <button className='ml-2 cursor-pointer'>
                        {!isAnimatingLight && <PlayCircleIcon color='lime' onClick={() => {
                            cancelAnimationFrame(refTimer.current)
                            useLighting.setState({
                                isAnimatingLight: true
                            })
                        }}></PlayCircleIcon>}

                        {isAnimatingLight && <PauseCircleIcon color='red' onClick={() => {
                            cancelAnimationFrame(refTimer.current)
                            useLighting.setState({
                                isAnimatingLight: false
                            })
                        }}></PauseCircleIcon>}
                    </button>

                </div>}

            </>}

        </div>}


    </>
}


