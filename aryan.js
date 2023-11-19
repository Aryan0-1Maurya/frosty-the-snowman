/* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/
"use strict"
console.log = () => null;

window.onload = function () {
    //global
    //let stats;
    let camera, scene, renderer;
    let sun, ground, frosty;
    let speed, freeze;
    let sphericalHelper = new THREE.Spherical();
    let timeElapsed, clock, animClock, mixer;
    let mixers = new Array(14), animClocks = new Array(14);
    let animationFrame;
    let frostyIsMoving = false, frostyHasCrashed = false;
    let obstacles, inPath, interval;
    let currentLane;
    let score, scoreLabel;
    let fx, hit, fxVol;
    let sphereMaterial, graffiti;
    const laneAngles = [degToRad(91.5), degToRad(90), degToRad(88.5)], laneWidth = 1.5, groundRadius = 26;  //all spherical coordinates were found experimentally

    //sets up the first screen and preloads all resources
    function welcome() {
        sphereMaterial = new THREE.MeshPhongMaterial();
        graffiti = new THREE.MeshBasicMaterial();

        THREE.ImageUtils.crossOrigin = '';
        sphereMaterial.map = THREE.ImageUtils.loadTexture('https://badasstechie.github.io/frosty/textures/snow.jpg');
        graffiti.map = THREE.ImageUtils.loadTexture('https://badasstechie.github.io/frosty/textures/ski.jpg');
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x00ffff);
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(0, 4, 1.25);
        sun.target.position.set(0, 0, 0);
        scene.add(sun);
        frosty = buildSnowman(false);
        scene.add(frosty);
        camera.position.y = 0.4;
        camera.position.z = 0.8;
        //camera.rotation.x += -degToRad(30);
        frosty.rotation.y = degToRad(165);
        frosty.rotation.x = degToRad(10);
        loadFx();
        loadHit();
    }

    //sets up everything else
    function init() {
        /*performance monitor
        stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);*/
        //initialize global variables
        speed = 0.006;
        freeze = false;
        timeElapsed = new THREE.Clock();
        clock = new THREE.Clock();
        animClock = new THREE.Clock();
        mixers.fill(null);
        animClocks.fill(null);
        frostyIsMoving = false;
        frostyHasCrashed = false;
        obstacles = [];
        inPath = [];
        interval = 0.5;
        currentLane = 0;
        score = 0;
        //sets up the scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xf0fff0, 0.14);
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);  //perspective camera
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });    //renderer with transparent backdrop
        renderer.setClearColor(0xfffafa, 1);
        renderer.shadowMap.enabled = true;  //enable shadow
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        //positions camera
        camera.position.z = 6.5;
        camera.position.y = 2.5;
        //adds elements
        addGround();
        addLight();
        addObjects();
        frosty = buildSnowman(true);
        scene.add(frosty);
        frosty.position.y = 1.18;
        frosty.position.z = 3.875;
        fxVol.gain.value = 1;
        //hud
        scoreLabel = document.createElement('div');
        scoreLabel.style.position = 'absolute';
        scoreLabel.style.top = '0px';
        scoreLabel.style.left = '0px';
        scoreLabel.style.width = '100%';
        scoreLabel.style.height = '40px';
        scoreLabel.style.fontSize = '20px';
        scoreLabel.style.fontWeight = 'bold';
        scoreLabel.style.color = '#ffffff';
        scoreLabel.style.textShadow = '0px 0px 10px #000000';
        scoreLabel.style.textAlign = 'center';
        scoreLabel.style.verticalAlign = 'middle';
        scoreLabel.style.lineHeight = '40px';
        scoreLabel.innerHTML = "Score: 0";
        document.body.appendChild(scoreLabel);
        //events
        document.onkeydown = handleKeyDown;
        window.addEventListener('resize', onWindowResize, false);
    }

    //preload audio
    function loadFx() {
        const url = 'https://badasstechie.github.io/frosty/audio/fx.mp3';
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        let context = new AudioContext();
        fx = context.createBufferSource();
        fxVol = context.createGain();
        fx.connect(fxVol);
        fxVol.connect(context.destination);
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            context.decodeAudioData(request.response, function (response) {
                fx.buffer = response;
                fx.loop = true;
                fxVol.gain.value = 0;
                fx.start(0);
            }, function () { console.error('The request failed.'); });
        }
        request.send();
    }

    function loadHit() {
        let listener = new THREE.AudioListener();
        camera.add(listener);
        hit = new THREE.Audio(listener);
        let audioLoader = new THREE.AudioLoader();
        audioLoader.load('https://badasstechie.github.io/frosty/audio/hit.mp3', function (buffer) {
            hit.setBuffer(buffer);
            hit.setLoop(false);
            hit.setVolume(1.5);
        });
    }

    //adds a sphere as the ground
    function addGround() {
        let sphereGeometry = new THREE.SphereBufferGeometry(groundRadius, 200/*rows*/, 200/*columns*/);

        ground = new THREE.Mesh(sphereGeometry, sphereMaterial);
        ground.receiveShadow = true;
        ground.castShadow = false;
        ground.rotation.z = -degToRad(90);   //90deg clockwise
        scene.add(ground);
        ground.position.y = -24;
        ground.position.z = -3;
        addWorldTrees();
    }

    //lights up the scene
    function addLight() {
        let hemisphereLight = new THREE.HemisphereLight(0xfffafa, 0x000000, 0.9)
        scene.add(hemisphereLight);
        sun = new THREE.DirectionalLight(0xcdc1c5, 0.9);
        sun.position.set(12, 6, -7);
        sun.castShadow = true;
        scene.add(sun);
        //set up shadow properties for the sun light
        sun.shadow.mapSize.width = 256;
        sun.shadow.mapSize.height = 256;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 50;
    }

    //idk
    function createSnowball(radius) {
        let snowballGeometry = new THREE.SphereBufferGeometry(radius, 10, 10);
        let whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xd5d9ef, shading: THREE.FlatShading });
        let snowball = new THREE.Mesh(snowballGeometry, whiteMaterial);
        snowball.scale.set(0.39, 0.36, 0.39);
        return snowball;
    }

    //creates trees
    function createTree() {
        let tree = new THREE.Object3D();
        //trunk
        let treeTrunkGeometry = new THREE.CylinderBufferGeometry(0.1, 0.1, 0.5);
        let trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x886633, shading: THREE.FlatShading });
        let treeTrunk = new THREE.Mesh(treeTrunkGeometry, trunkMaterial);
        treeTrunk.position.y = 0.25;
        tree.add(treeTrunk);
        //layer1
        let tree1Geometry = new THREE.CylinderBufferGeometry(0.4, 0.7, 0.4, 8, 6);
        let treeMaterial = new THREE.MeshStandardMaterial({ color: 0x33ff33, shading: THREE.FlatShading });
        let tree1 = new THREE.Mesh(tree1Geometry, treeMaterial);
        tree1.position.y = 0.7;
        tree1.receiveShadow = false;
        tree1.castShadow = true;
        tree.add(tree1);
        addSnow(tree, 0.55, 0.7, 6);
        //layer2
        let tree2Geometry = new THREE.CylinderBufferGeometry(0.2, 0.5, 0.4, 8, 6);
        let tree2 = new THREE.Mesh(tree2Geometry, treeMaterial);
        tree2.position.y = 1.1;
        tree2.receiveShadow = false;
        tree2.castShadow = true;
        tree.add(tree2);
        addSnow(tree, 0.35, 1.1, 4);
        //layer3
        let tree3Geometry = new THREE.ConeBufferGeometry(0.3, 0.4, 8, 6);
        let tree3 = new THREE.Mesh(tree3Geometry, treeMaterial);
        tree3.position.y = 1.5;
        tree3.receiveShadow = false;
        tree3.castShadow = true;
        tree.add(tree3);
        addSnow(tree, 0.15, 1.5, 2);
        tree.scale.set(0.36, 0.5, 0.36);
        tree.rotation.y += degToRad(90);
        return tree;
    }

    //adds snowballs to trees
    function addSnow(tree, pos, height, number) {
        let snowballs = new Array(number);
        for (let x = 0; x <= number - 1; x++) {
            let radius = Math.random() * (0.08 - 0.03) + 0.03;
            let geometry = new THREE.SphereBufferGeometry(radius, 5, 5);
            let material = new THREE.MeshBasicMaterial({ color: 0xd5d9ef, shading: THREE.FlatShading });
            snowballs[x] = new THREE.Mesh(geometry, material);
            snowballs[x].position.x = pos;
            snowballs[x].position.y = height;
            rotateAbout(snowballs[x], new THREE.Vector3(0, height, 0), new THREE.Vector3(0, 1, 0), degToRad((360 / number) * x));
            tree.add(snowballs[x]);
        }
    }

/* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/

    //building the snowman was a pain in the ass 😒. You're better off using a visual tool like blender
    function buildSnowman(ski) {
        let snowman = new THREE.Object3D();
        //ski blades
        if (ski) {
            let rectGeometry = new THREE.BoxBufferGeometry(0.2, 0.06, 1.4);

            let blueMaterial = new THREE.MeshBasicMaterial({ color: 0x265C95, shading: THREE.FlatShading });
            let faces = [blueMaterial, blueMaterial, graffiti, graffiti, blueMaterial, blueMaterial];
            let rect1 = new THREE.Mesh(rectGeometry, faces);
            rect1.position.y = 0.03;
            rect1.position.x = 0.3;
            snowman.add(rect1);
            let rect2 = new THREE.Mesh(rectGeometry, faces);
            rect2.position.y = 0.04;
            rect2.position.x = -0.3;
            snowman.add(rect2);
            let rect3Geometry = new THREE.BoxBufferGeometry(0.2, 0.06, 0.4);
            let rect3 = new THREE.Mesh(rect3Geometry, faces);
            rect3.position.y = 0.04;
            rect3.position.x = 0.3;
            rect3.position.z = 0.9;
            rotateAbout(rect3, new THREE.Vector3(0.3, 0.04, 0.7), new THREE.Vector3(1, 0, 0), -degToRad(30));
            snowman.add(rect3);
            let rect4 = new THREE.Mesh(rect3Geometry, faces);
            rect4.position.y = 0.04;
            rect4.position.x = -0.3;
            rect4.position.z = 0.9;
            rotateAbout(rect4, new THREE.Vector3(-0.3, 0.04, 0.7), new THREE.Vector3(1, 0, 0), -degToRad(30));
            snowman.add(rect4);
            let cylGeometry = new THREE.CylinderBufferGeometry(0.1, 0.1, 0.06, 20, 1, false, degToRad(90), -degToRad(180));
            let cyl1 = new THREE.Mesh(cylGeometry, blueMaterial);
            cyl1.position.y = 0.04;
            cyl1.position.x = 0.3;
            cyl1.position.z = 1.1;
            rotateAbout(cyl1, new THREE.Vector3(0.3, 0.04, 0.7), new THREE.Vector3(1, 0, 0), -degToRad(30));
            snowman.add(cyl1);
            let cyl2 = new THREE.Mesh(cylGeometry, blueMaterial);
            cyl2.position.y = 0.04;
            cyl2.position.x = -0.3;
            cyl2.position.z = 1.1;
            rotateAbout(cyl2, new THREE.Vector3(-0.3, 0.04, 0.7), new THREE.Vector3(1, 0, 0), -degToRad(30));
            snowman.add(cyl2);
            let cyl3 = new THREE.Mesh(cylGeometry, blueMaterial);
            cyl3.position.y = 0.04;
            cyl3.position.x = 0.3;
            cyl3.position.z = -0.7;
            cyl3.rotation.x += degToRad(180);
            snowman.add(cyl3);
            let cyl4 = new THREE.Mesh(cylGeometry, blueMaterial);
            cyl4.position.y = 0.04;
            cyl4.position.x = -0.3;
            cyl4.position.z = -0.7;
            cyl4.rotation.x += degToRad(180);
            snowman.add(cyl4);
        }
        //trunk
        let trunkGeometry = new THREE.SphereBufferGeometry(0.45, 20, 20);
        let whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xd5d9ef, shading: THREE.FlatShading });
        let trunk = new THREE.Mesh(trunkGeometry, whiteMaterial);
        trunk.position.y = 0.45;
        snowman.add(trunk);
        //top
        let topGeometry = new THREE.SphereBufferGeometry(0.3, 20, 20);
        let top = new THREE.Mesh(topGeometry, whiteMaterial);
        top.position.y = 0.95;
        snowman.add(top);
        //head
        let headGeometry = new THREE.SphereBufferGeometry(0.2, 20, 20);
        let head = new THREE.Mesh(headGeometry, whiteMaterial);
        head.position.y = 1.35;
        snowman.add(head);
        //scarf
        let scarfGeometry = new THREE.TorusBufferGeometry(0.18, 0.02, 16, 30, 6.3);
        let blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, shading: THREE.FlatShading });
        let scarf = new THREE.Mesh(scarfGeometry, blackMaterial);
        scarf.position.y = 1.22;
        scarf.rotation.x = Math.PI / 2;
        snowman.add(scarf);
        //hat1
        let hat1Geometry = new THREE.CylinderBufferGeometry(0.16, 0.16, 0.03, 20);
        let hat1 = new THREE.Mesh(hat1Geometry, blackMaterial);
        hat1.position.y = 1.55;
        rotateAbout(hat1, new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(0, 0, 1), -degToRad(15));
        snowman.add(hat1);
        //hat2
        let hat2Geometry = new THREE.CylinderBufferGeometry(0.12, 0.12, 0.05, 20);
        let redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, shading: THREE.FlatShading });
        let hat2 = new THREE.Mesh(hat2Geometry, redMaterial);
        hat2.position.y = 1.575;
        rotateAbout(hat2, new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(0, 0, 1), -degToRad(15));
        snowman.add(hat2);
        //hat3
        let hat3Geometry = new THREE.CylinderBufferGeometry(0.12, 0.12, 0.2, 20);
        let hat3 = new THREE.Mesh(hat3Geometry, blackMaterial);
        hat3.position.y = 1.7;
        rotateAbout(hat3, new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(0, 0, 1), -degToRad(15));
        snowman.add(hat3);
        //button1
        let button1Geometry = new THREE.SphereBufferGeometry(0.03, 10, 10);
        let button1 = new THREE.Mesh(button1Geometry, blackMaterial);
        button1.position.y = 1.25;
        rotateAbout(button1, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(1, 0, 0), -degToRad(80));
        snowman.add(button1);
        //button2
        let button2Geometry = new THREE.SphereBufferGeometry(0.03, 10, 10);
        let button2 = new THREE.Mesh(button2Geometry, blackMaterial);
        button2.position.y = 1.25;
        rotateAbout(button2, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(1, 0, 0), -degToRad(60));
        snowman.add(button2);
        //button3
        let button3Geometry = new THREE.SphereBufferGeometry(0.03, 10, 10);
        let button3 = new THREE.Mesh(button3Geometry, blackMaterial);
        button3.position.y = 1.25;
        rotateAbout(button3, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(1, 0, 0), -degToRad(100));
        snowman.add(button3);
        //eye1
        let eye1Geometry = new THREE.SphereBufferGeometry(0.02, 10, 10);
        let eye1 = new THREE.Mesh(eye1Geometry, blackMaterial);
        eye1.position.y = 1.55;
        rotateAbout(eye1, new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(1, 0, 0), -degToRad(60));
        rotateAbout(eye1, new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(0, 1, 0), -degToRad(20));
        snowman.add(eye1);
        //eye2
        let eye2Geometry = new THREE.SphereBufferGeometry(0.02, 10, 10);
        let eye2 = new THREE.Mesh(eye2Geometry, blackMaterial);
        eye2.position.y = 1.55;
        rotateAbout(eye2, new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(1, 0, 0), -degToRad(60));
        rotateAbout(eye2, new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(0, 1, 0), degToRad(20));
        snowman.add(eye2);
        //nose
        let noseGeometry = new THREE.ConeBufferGeometry(0.025, 0.1, 15);
        let orangeMaterial = new THREE.MeshBasicMaterial({ color: 0xe66000 });
        let nose = new THREE.Mesh(noseGeometry, orangeMaterial);
        nose.position.y = 1.6;
        rotateAbout(nose, new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(1, 0, 0), -degToRad(75));
        snowman.add(nose);
        //mouth
        let mouthGeometry = new THREE.TorusBufferGeometry(0.1, 0.01, 16, 25, -2.1);
        let mouth = new THREE.Mesh(mouthGeometry, blackMaterial);
        mouth.position.y = 1.41;
        mouth.position.z = -0.21;
        mouth.rotation.z -= degToRad(30);
        snowman.add(mouth);
        //left arm
        let leftArmGeometry = new THREE.CylinderBufferGeometry(0.02, 0.02, 0.24, 20);
        let brownMaterial = new THREE.MeshBasicMaterial({ color: 0x5E4E4A });
        let leftArm = new THREE.Mesh(leftArmGeometry, brownMaterial);
        leftArm.position.y = 1.37;
        rotateAbout(leftArm, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 0, 1), degToRad(75));
        snowman.add(leftArm);
        let leftArm1Geometry = new THREE.CylinderBufferGeometry(0.02, 0.02, 0.08, 20);
        let leftArm1 = new THREE.Mesh(leftArm1Geometry, brownMaterial);
        leftArm1.position.y = 1.53;
        rotateAbout(leftArm1, new THREE.Vector3(0, 1.49, 0), new THREE.Vector3(0, 0, 1), degToRad(45));
        rotateAbout(leftArm1, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 0, 1), degToRad(75));
        snowman.add(leftArm1);
        let leftArm2Geometry = new THREE.CylinderBufferGeometry(0.02, 0.02, 0.08, 20);
        let leftArm2 = new THREE.Mesh(leftArm2Geometry, brownMaterial);
        leftArm2.position.y = 1.53;
        rotateAbout(leftArm2, new THREE.Vector3(0, 1.49, 0), new THREE.Vector3(0, 0, 1), -degToRad(30));
        rotateAbout(leftArm2, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 0, 1), degToRad(75));
        snowman.add(leftArm2);
        //right arm
        let rightArmGeometry = new THREE.CylinderBufferGeometry(0.02, 0.02, 0.36, 20);
        let rightArm = new THREE.Mesh(rightArmGeometry, brownMaterial);
        rightArm.position.y = 1.43;
        rotateAbout(rightArm, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 0, 1), -degToRad(75));
        snowman.add(rightArm);
        let rightArm2Geometry = new THREE.CylinderBufferGeometry(0.02, 0.02, 0.12, 20);
        let rightArm2 = new THREE.Mesh(rightArm2Geometry, brownMaterial);
        rightArm2.position.y = 1.6;
        rotateAbout(rightArm2, new THREE.Vector3(0, 1.54, 0), new THREE.Vector3(0, 0, 1), -degToRad(45));
        rotateAbout(rightArm2, new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 0, 1), -degToRad(75));
        snowman.add(rightArm2);
        snowman.scale.set(0.42, 0.42, 0.42);
        return snowman;
    }

    //makes frosty strafe left or right
    function moveSnowman(moveLeft, duration) {
        if ((currentLane == -1 && moveLeft == true) || (currentLane == 1 && moveLeft == false) || frostyIsMoving) return;   //makes sure frosty stays in one of the lanes
        let dX = moveLeft ? -laneWidth * frosty.scale.x : laneWidth * frosty.scale.x;
        let dTheta = moveLeft ? -degToRad(30) : degToRad(30);
        let movement = new THREE.VectorKeyframeTrack('.position', [0, duration], [frosty.position.x, frosty.position.y, frosty.position.z, frosty.position.x + dX, frosty.position.y, frosty.position.z]);
        let yAxis = new THREE.Vector3(0, 1, 0);
        let qInitial = new THREE.Quaternion().setFromAxisAngle(yAxis, 0);
        let qFinal = new THREE.Quaternion().setFromAxisAngle(yAxis, dTheta);
        let rotation = new THREE.QuaternionKeyframeTrack('.quaternion', [0, duration / 2, duration], [qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w, qInitial.x, qInitial.y, qInitial.z, qInitial.w]);
        let clip = new THREE.AnimationClip('strafe', duration, [movement, rotation]);
        mixer = new THREE.AnimationMixer(frosty);
        mixer.addEventListener('finished', function (e) {
            frostyIsMoving = false;
        });
        let anim = mixer.clipAction(clip);
        anim.setLoop(THREE.LoopOnce);
        anim.clampWhenFinished = true;
        frostyIsMoving = true;
        anim.play();
        currentLane += moveLeft ? -1 : 1;
    }

    //adds trees or snowballs
    function spawnObstacles(inLane, lane, isLeft, row) {
        //isLeft and row only apply when inLane === false and lane only applies when inLane === true
        let newObj = createTree();
        if (inLane) {
            if (obstacles.length == 0) return;  //adds no more than what's in the array
            newObj = obstacles.pop();
            newObj.visible = true;
            inPath.push(newObj);
            let offsetY = (newObj.type == "Mesh") ? 0.273 : 0;  //if it's a mesh then apply an offset
            sphericalHelper.set(groundRadius + offsetY, laneAngles[lane], degToRad(257) - ground.rotation.x);
        } else {
            newObj = createTree();
            sphericalHelper.set(groundRadius, isLeft ? degToRad(93 + (Math.random() * 3)) : degToRad(87 - (Math.random() * 3)), row);
        }
        newObj.position.setFromSpherical(sphericalHelper);
        if (newObj.type != "Mesh") {
            let rollingGroundVector = ground.position.clone().normalize();
            let treeVector = newObj.position.clone().normalize();
            newObj.quaternion.setFromUnitVectors(treeVector, rollingGroundVector);
            newObj.rotation.x += (Math.random() * (2 * Math.PI / 10)) + -Math.PI / 10;
        }
        ground.add(newObj);
    }

    //creates trees or snowballs
    function addObjects() {
        for (let i = 0; i < 10; ++i) obstacles.push((Math.random() > 0.5) ? createTree() : createSnowball(0.7));
    }

    //adds obstacles on lane
    function addToPath() {
        let options = [0, 1, 2];
        let lane = Math.floor(Math.random() * 3);
        spawnObstacles(true, lane);
        options.splice(lane, 1);
        if (Math.random() > 0.5) {
            lane = Math.floor(Math.random() * 2);
            spawnObstacles(true, options[lane]);
        }
    }

    //removes everything out of scope
    function removeFromPath() {
        let obj, objPos = new THREE.Vector3(), objToRemove = [];
        inPath.forEach(function (element, index) {
            obj = inPath[index];
            objPos.setFromMatrixPosition(obj.matrixWorld);
            if (objPos.z > 6 && obj.visible) {    //gone out of scene
                objToRemove.push(obj);
            } else {
                //check collision
                if (objPos.distanceTo(frosty.position) <= 0.4) {
                    fxVol.gain.value = 0;
                    hit.play();
                    frostyHasCrashed = true;
                    freeze = true;
                    frosty.visible = false;
                    explode({ x: frosty.position.x, y: frosty.position.y + 0.5, z: frosty.position.z }, 1, 0.5);
                    setTimeout(function () {
                       swal({
                            title: "Poof!",
                            text: "You crashed.",
                            icon: "error",
                            buttons: {
                                cancel: "Quit",
                                confirm: "Restart"
                            }
                        }).then(val => {
                            if (val) {
                                cancelAnimationFrame(animationFrame);
                                document.body.removeChild(renderer.domElement);
                                document.body.removeChild(scoreLabel);
                                init();
                                animate();
                            }
                        });
                    }, 500);
                }
            }
        });
        let arrayIndex;
        objToRemove.forEach(function (element, index) {
            obj = objToRemove[index];
            arrayIndex = inPath.indexOf(obj);
            inPath.splice(arrayIndex, 1);
            obstacles.push(obj);
            obj.visible = false;
        });
    }

    //adds trees on the outside track 
    function addWorldTrees() {
        let numTrees = 36, gap = 2 * Math.PI / numTrees;
        for (let i = 0; i < numTrees; ++i) {
            spawnObstacles(false, 0, true, i * gap);
            spawnObstacles(false, 0, false, i * gap);
        }
    }

    //adds explosion to a given point
    function explode(origin, range, duration) {
        //avoids interrupting any animation in progress
        for (let i = 0; i < mixers.length; ++i) {
            if (mixers[i] !== null) return;
        }
        //creates the snowballs
        let snowballs = [];
        for (let i = 0; i < 14; ++i) {
            let geometry = new THREE.SphereBufferGeometry(0.08, 12, 12);
            let material = new THREE.MeshBasicMaterial({ color: 0xd5d9ef, shading: THREE.FlatShading });
            let snowball = new THREE.Mesh(geometry, material);
            snowball.position.x = origin.x;
            snowball.position.y = origin.y;
            snowball.position.z = origin.z;
            snowballs.push(snowball);
            scene.add(snowballs[snowballs.length - 1]);
        }
        const coeff = Math.cos(degToRad(45));
        let coordinates = [
            { x: 0, y: 0, z: range },
            { x: 0, y: range, z: 0 },
            { x: range, y: 0, z: 0 },
            { x: 0, y: 0, z: -range },
            { x: 0, y: -range, z: 0 },
            { x: -range, y: 0, z: 0 },
            { x: range * coeff, y: range * coeff, z: range * coeff },
            { x: -range * coeff, y: -range * coeff, z: -range * coeff },
            { x: range * coeff, y: range * coeff, z: -range * coeff },
            { x: range * coeff, y: -range * coeff, z: range * coeff },
            { x: -range * coeff, y: range * coeff, z: range * coeff },
            { x: range * coeff, y: -range * coeff, z: -range * coeff },
            { x: -range * coeff, y: range * coeff, z: -range * coeff },
            { x: -range * coeff, y: -range * coeff, z: range * coeff }
        ];
        //animates the snowballs
        let clips = [], anims = [];
        for (let i = 0; i < 14; ++i) {
            clips.push(new THREE.AnimationClip('explode', duration, [new THREE.VectorKeyframeTrack('.position', [0, duration], [snowballs[i].position.x, snowballs[i].position.y, snowballs[i].position.z, snowballs[i].position.x + coordinates[i].x, snowballs[i].position.y + coordinates[i].y, snowballs[i].position.z + coordinates[i].z])]));
            animClocks[i] = new THREE.Clock();
            mixers[i] = new THREE.AnimationMixer(snowballs[i]);
            mixers[i].addEventListener('finished', function (e) {
                scene.remove(snowballs[i]);
                mixers[i] = null;
                animClocks[i] = null;
            });
            anims.push(mixers[i].clipAction(clips[clips.length - 1]));
            anims[anims.length - 1].setLoop(THREE.LoopOnce);
            anims[anims.length - 1].clampWhenFinished = true;
            anims[anims.length - 1].play();
        }
    }

    //rotates objects a given point - pivot and axis expressed in vector form, angle in radians
    function rotateAbout(obj, pivot, axis, theta) {
        obj.position.sub(pivot); // remove the offset
        obj.position.applyAxisAngle(axis, theta); // rotate the position
        obj.position.add(pivot); // re-add the offset
        obj.rotateOnAxis(axis, theta); // rotate the object
    }

    //expresses angles in radians
    function degToRad(deg) {
        return (deg / 180) * Math.PI;
    }

    //animates the game
    function animate() {
        //stats.begin();
        if (!freeze) {
            ground.rotation.x += speed;   //simulates movement of elements when it's the ground that's actually moving
            if (timeElapsed.getElapsedTime() > 1 && clock.getElapsedTime() > interval) {  //timeElapsed makes sure trees or snowballs don't spawn too early
                clock.start();
                addToPath();
                if (!frostyHasCrashed) {
                    if (score % 50 == 0 && score != 0) {
                        speed += 0.001;    //gradually increases speed
                    }
                    //increase the score for every tree the player has dodged
                    score++;
                    scoreLabel.innerText = 'Score: ' + score.toString();
                }
            }
            removeFromPath();
        }
        render(); //draw
        //stats.end();
        animationFrame = requestAnimationFrame(animate);  //request next update
    }

    //render loop
    function render() {
        if (!freeze) {
            if (mixer) {
                mixer.update(animClock.getDelta());
            }
        }
        mixers.forEach(function (element, index) {
            if (element) {
                element.update(animClocks[index].getDelta());
            }
        });
        renderer.render(scene, camera);//draw
        //console.log(renderer.info.render.calls);
    }

    //event handler(s)
    function onWindowResize() {
        //resize & align
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    //arrow keys(computer)
    function handleKeyDown(keyEvent) {
        if (keyEvent.keyCode === 37) {  //left
            moveSnowman(true, 0.4);
        } else if (keyEvent.keyCode === 39) {   //right
            moveSnowman(false, 0.4);
        }
    }
    //swipe(mobile)
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
    let xDown = null;
    let yDown = null;
    function getTouches(evt) {
        return evt.touches || evt.originalEvent.touches;
    }
    function handleTouchStart(evt) {
        const firstTouch = getTouches(evt)[0];
        xDown = firstTouch.clientX;
        yDown = firstTouch.clientY;
    };
    function handleTouchMove(evt) {
        if (!xDown || !yDown) {
            return;
        }
        let xUp = evt.touches[0].clientX;
        let yUp = evt.touches[0].clientY;
        let xDiff = xDown - xUp;
        let yDiff = yDown - yUp;
        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > 0) {
                moveSnowman(true, 0.4); //left
            } else {
                moveSnowman(false, 0.4); //right
            }
        }
        xDown = null;
        yDown = null;
    };
    welcome();
    renderer.render(scene, camera);
    swal({
        title: "Help Frosty make it to Christmas!",
        text: (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? 'Swipe left or right to move' : 'Use the left or right arrow keys to move',
        button: "Play"
    }).then(function () {
        document.body.removeChild(renderer.domElement);
        init();
        animate();
    });
}

/* 

    #############################################################
      
          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

(   By ~Aryan Maurya Mr.perfect https://amsrportfolio.netlify.app  )

          @@@@@@@@@@    &&&&&&&&&&&&&&&&&&&    %%%%%%%%%%

    #############################################################

*/