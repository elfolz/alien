import * as THREE from './three.module.js'
import { GLTFLoader } from './gltfLoader.module.js'
import { FBXLoader } from './fbxLoader.module.js'
import { OrbitControls } from './orbitControls.js'

if (location.protocol.startsWith('https')) {
	navigator.serviceWorker.register('service-worker.js')
	navigator.serviceWorker.onmessage = m => {
		console.info('Update found!')
		if (m?.data == 'update') location.reload(true)
	}
}

const clock = new THREE.Clock()
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true})
const camera = new THREE.PerspectiveCamera(75, window.innerWidth /window.innerHeight, 0.1, 1000)
const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x000000, 0.25)
const dirLight1 = new THREE.DirectionalLight(0xFFFFFF, 1)
const dirLight2 = new THREE.DirectionalLight(0xFFFFFF, 1)
const dirLight3 = new THREE.DirectionalLight(0xFFFFFF, 1)
const gltfLoader = new GLTFLoader()
const fbxLoader = new FBXLoader()
const scene = new THREE.Scene()
const controls = new OrbitControls(camera, renderer.domElement)
const fpsLimit = 1 / 60
const reader = new FileReader()
const animationModels = ['agreeing', 'clapping', 'disappointed', 'dismissing', 'fistPump', 'formalBow', 'idle', 'shakeFist', 'surprised', 'talking', 'walking']

const progress = new Proxy({}, {
	set: function(target, key, value) {
		target[key] = value
		let values = Object.values(target).slice()
		let progressbar = document.querySelector('progress')
		let total = values.reduce((a, b) => a + b, 0)
		total = total / (animationModels.length + 1)
		if (progressbar) progressbar.value = parseInt(total || 0)
		if (total >= 100) setTimeout(() => initGame(), 1000)
		return true
	}
})

scene.background = null
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.sortObjects = false
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.setClearColor(0x000000, 0)
scene.add(hemisphereLight)
controls.screenSpacePanning = true
controls.enableZoom = false
dirLight1.position.set(0, 0, 0)
dirLight2.position.set(100, -50, 0)
dirLight3.position.set(-100, -50, 0)
scene.add(dirLight1)
scene.add(dirLight2)
scene.add(dirLight3)

var clockDelta = 0
var gameStarted = false
var alien
var mixer
var photo
var animations = []
var lastAction

reader.onload = e => {
	photo.src = e.target.result
}

function loadModel() {
	gltfLoader.load('./models/alien.glb',
		gltf => {
			alien = gltf.scene
			alien.colorSpace = THREE.SRGBColorSpace
			alien.position.y = -50
			mixer = new THREE.AnimationMixer(alien)
			dirLight1.target = alien
			dirLight2.target = alien
			dirLight3.target = alien
			scene.add(alien)
			loadAnimations()
		}, xhr => {
			progress['alien'] = (xhr.loaded / (xhr.total || 1)) * 100
		}, error => {
			console.error(error)
		}
	)
}

function loadAnimations() {
	animationModels.forEach(el => {
		fbxLoader.load(`./models/${el}.fbx`, fbx => {
			animations[el] = mixer.clipAction(fbx.animations[0])
			animations[el].name = el
			if (el == 'idle') {
				lastAction = animations[el]
				animations[el].play()
			}
		}, xhr => {
			progress[el] = (xhr.loaded / (xhr.total || 1)) * 100
		}, error => {
			console.error(error)
		})
	})
}

function initGame() {
	if (gameStarted) return
	gameStarted = true
	document.body.classList.add('loaded')
	document.body.removeChild(document.querySelector('figure'))
	document.querySelector('footer').style.removeProperty('display')
	resizeScene()
	animate()
}

function resizeScene() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	camera.position.z = 100
}

function animate() {
	requestAnimationFrame(animate)
	if (document.hidden) return
	clockDelta += clock.getDelta()
	if (fpsLimit && clockDelta < fpsLimit) return
	mixer?.update(clockDelta)
	renderer.render(scene, camera)
	controls.update()
	clockDelta = fpsLimit ? clockDelta % fpsLimit : clockDelta
}

function executeCrossFade(newAction) {
	if (lastAction == newAction) return
	newAction.enabled = true
	newAction.setEffectiveTimeScale(1)
	newAction.setEffectiveWeight(1)
	newAction.loop = 'repeat'
	lastAction.crossFadeTo(newAction, 0.25, true)
	lastAction = newAction
	newAction.play()
}

window.onresize = () => resizeScene()
window.oncontextmenu = e => {e.preventDefault(); return false}

document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	loadModel()
	document.querySelector('button').onclick = () => {
		const i = animationModels.findIndex(el => el == lastAction.name)
		const index = i < (animationModels.length-1) ? i+1 : 0
		executeCrossFade(animations[animationModels[index]])
	}
}
document.body.appendChild(renderer.domElement)