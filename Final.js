var Key = {
    pressed: {},
	
    LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	C: 67,
	ONE: 49,
	TWO: 50,
	
    isDown: function(keyCode) {
        return this.pressed[keyCode];
    },
  
    onKeydown: function(event) {
        this.pressed[event.keyCode] = true;
    },
  
    onKeyup: function(event) {
        delete this.pressed[event.keyCode];
    }
};

window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);

//Global Variables //

//Scene
var scene = new THREE.Scene();
//Camera
var cState = true;
//Player
var playerWidth = 50;
var playerHeight = 100;
//Bullet
var bulletSize = 10;
var bulletFreq = 10;
//Enemy
var enemySize = 50;
//Bullet and Enemy array
var playerBullets = [];
var enemies = [];

var buildings = [];
var points = 0;
var alive = true;

//Color Materials
var playerColorMaterial = new THREE.MeshNormalMaterial( { side: THREE.DoubleSide } );
var enemyColorMaterial= new THREE.MeshBasicMaterial( { color: 0xff0000 } );
var bulletColorMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
var buildingColorMaterial = new THREE.MeshBasicMaterial( { color: 0xA0A0A0 } );
//Geometry Materials
var bulletGeometry = new THREE.SphereGeometry(bulletSize);
var buildingGeometry = new THREE.BoxGeometry(200,200,800);


//Geometry
//Player Wing
//Arguments: Vector2 (sides, depth)
function createWing(size) {
	var geom = new THREE.Geometry();
	
	var v1 = new THREE.Vector3(0,0,0);
	var v2 = new THREE.Vector3(size.x,0,0);
	var v3 = new THREE.Vector3(size.x,size.x,0);
	
	var v4 = new THREE.Vector3(0,0,size.y);
	var v5 = new THREE.Vector3(size.x,0,size.y);
	var v6 = new THREE.Vector3(size.x,size.x,size.y);

	geom.vertices.push(v1);
	geom.vertices.push(v2);
	geom.vertices.push(v3);
	geom.vertices.push(v4);
	geom.vertices.push(v5);
	geom.vertices.push(v6);
	
	
	geom.faces.push( new THREE.Face3( 0, 1, 2 ) );
	geom.faces.push( new THREE.Face3( 3, 4, 5 ) );
	
	geom.faces.push( new THREE.Face3( 0, 1, 4 ) );
	geom.faces.push( new THREE.Face3( 0, 4, 3 ) );
	
	geom.faces.push( new THREE.Face3( 1, 2, 4 ) );
	geom.faces.push( new THREE.Face3( 2, 5, 4 ) );
	
	geom.faces.push( new THREE.Face3( 2, 3, 0 ) );
	geom.faces.push( new THREE.Face3( 2, 1, 3 ) );
	
	geom.computeFaceNormals();

	var mesh= new THREE.Mesh( geom, playerColorMaterial );
	
	return mesh;
}

//Player Base
//Argument: Vector2 (width, length)
function createBase(size) {
	var whole = new THREE.Object3D();
	
	var center = new THREE.CylinderGeometry(size.x, size.x, size.y/2, 64, 64);
	var head = new THREE.CylinderGeometry(0, size.x, size.y/2, 32, 32);
	
	var cMesh = new THREE.Mesh(center, playerColorMaterial);
	var hMesh = new THREE.Mesh(head, playerColorMaterial);
	
	hMesh.position.y += size.y/2;
	
	cMesh.castShadow = true;
	hMesh.castShadow = true;
	
	whole.add(cMesh);
	whole.add(hMesh);
	
	return whole;
}

//Player Whole
//Argument: ( Vector2 (width, length), Vector2 (sides, depth) )
function createWhole(cSize, wSize) {
	var whole = new THREE.Object3D();

	w1 = createWing(wSize);
	w2 = createWing(wSize);
	
	base = createBase(cSize);

	w1.position.x -= wSize.x + cSize.x/2;
	w1.position.y -= cSize.y/4;
	w1.position.z -= wSize.y/2;
	
	w2.rotation.y += Math.PI;
	
	w2.position.x += wSize.x + cSize.x/2;
	w2.position.y -= cSize.y/4;
	w2.position.z += wSize.y/2;
	
	w1.castShadow = true;
	w2.castShadow = true;
	
	whole.add(w1);
	whole.add(w2);
	whole.add(base);
	
	return whole;
}

//Axis Alligned Bounding Box
function AABB(pos, size) {
	this.pos = pos;
	this.size = size;
}

//Collision between another AABB check
AABB.prototype.collides = function(b) {
	if (Math.abs(this.pos.x - b.pos.x) < this.size.x + b.size.x)
		if(Math.abs(this.pos.y - b.pos.y) < this.size.y + b.size.y)
			return true;
	return false;
}

//Enemy class
function Enemy(pos, size, color) {
	this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.x), color);
	this.mesh.position.set(pos.x, pos.y, 0);
	this.AABB = new AABB(new THREE.Vector2(this.mesh.position.x, this.mesh.position.y), new THREE.Vector2(playerWidth/2, playerHeight/2));
	this.yVelocity = 0;
	this.xVelocity = 0;
}

//Move Player one step
Enemy.prototype.move = function(){
	this.AABB.pos.x += this.xVelocity;
	this.AABB.pos.y += this.yVelocity;
	this.setPosition();
}

//Sets players mesh from AABB position
Enemy.prototype.setPosition = function() {
	this.mesh.position.set(this.AABB.pos.x, this.AABB.pos.y, 0);
}

//Player class
//position 		Vector2
//size			Vector2
//shot velocity	Float
//color			Material
function Player(pos, size, shotVelocity, color) {
	this.mesh = createWhole(new THREE.Vector2(25, 100), new THREE.Vector2(50, 10));
	//this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.x), color);
	this.mesh.position.set(pos.x, pos.y, 0);
	this.AABB = new AABB(new THREE.Vector2(this.mesh.position.x, this.mesh.position.y), new THREE.Vector2(playerWidth/2, playerHeight/2));
	this.yVelocity = 0;
	this.xVelocity = 0;
	this.rot = 0;
	this.shotVelocity = shotVelocity;
	this.idle = true;
}

//Sets players AABB from mesh position
Player.prototype.setAABB = function() {
	this.AABB = new AABB(new THREE.Vector2(this.mesh.position.x, this.mesh.position.y), new THREE.Vector2(playerWidth/2, playerHeight/2));
}

//Sets players mesh from AABB position
Player.prototype.setPosition = function() {
	this.mesh.position.set(this.AABB.pos.x, this.AABB.pos.y, 0);
}

//Player shoot function
Player.prototype.shoot = function() {
	shootFrom = new THREE.Vector2(this.AABB.pos.x, this.AABB.pos.y + playerHeight/2);
	bullet = new Bullet(shootFrom, this.shotVelocity);
	playerBullets.push(bullet);
	bullet.mesh.castShadow = true;
	scene.add(bullet.mesh);
}

//Move Player one step
Player.prototype.move = function(){
	this.AABB.pos.x += this.xVelocity;
	this.AABB.pos.y += this.yVelocity;
	this.setPosition();
	if(this.idle && this.rot != 0)
		this.idleTick = this.rot / 15;
		
	if(this.xVelocity == 0)
		this.idle = true;
	else
		this.idle = false;
		
	if(this.idle){
		if(this.rot > 0){		
			this.rot -= this.idleTick;
		}
		else if(this.rot < 0){
			this.rot -= this.idleTick;
		}
	}
	
	this.mesh.rotation.y = this.rot;
}

Player.prototype.cameraPosition = function() {
	return new THREE.Vector3(this.AABB.pos.x, this.AABB.pos.y - playerHeight/2 - 100 , 75);
}

//Bullet Class
function Bullet(pos, velocity) {
	this.mesh = new THREE.Mesh(bulletGeometry, bulletColorMaterial);
	this.mesh.position.set(pos.x, pos.y, 0);
	this.AABB = new AABB(new THREE.Vector2(this.mesh.position.x, this.mesh.position.y), new THREE.Vector2(bulletSize/2, bulletSize/2));
	this.yVelocity = velocity;	
}

//Move Bullet one step
Bullet.prototype.move = function() {
	this.AABB.pos.y += this.yVelocity;
	this.setPosition();
}

//Sets bullets mesh from AABB position
Bullet.prototype.setPosition = function() {
	this.mesh.position.set(this.AABB.pos.x, this.AABB.pos.y, 0);
}

//Spawn enemy in random X position at the top of the screen
function spawnEnemy() {
	enemy = new Enemy( new THREE.Vector2(Math.floor((Math.random()*600) - 300), 700), 
						new THREE.Vector2(enemySize, enemySize), 
						enemyColorMaterial);
	enemy.yVelocity = -5;
	enemy.mesh.castShadow = true;
	enemies.push(enemy);
	scene.add(enemy.mesh);
}

//Spawn building
function spawnBuilding() {
	var building = new THREE.Mesh(buildingGeometry, buildingColorMaterial)
	building.position.z = -1000 + 400;
	building.position.x = 300;
	building.position.y = 1500;
	building.castShadow = true;
	building.receiveShadow = true;
	buildings.push(building);

	scene.add(building);
	
	var building = new THREE.Mesh(buildingGeometry, buildingColorMaterial)
	building.position.z = -1000 + 400;
	building.position.x = -300;
	building.position.y = 1500;
	building.castShadow = true;
	building.receiveShadow = true;
	buildings.push(building);

	scene.add(building);
}

function main(){
	var div = document.getElementById("points");

	//THREE.JS setup
	var camera = new THREE.PerspectiveCamera( 45, 480/854, 1, 10000 );	
	var renderer = new THREE.WebGLRenderer();
	renderer.setSize( 480, 854 );
	renderer.shadowMapEnabled = true;
	document.body.appendChild( renderer.domElement );
	camera.position.set(0,150,1500);
	camera.lookAt(new THREE.Vector3(0, 0, 0));	
	
	//Background stuff	
	var grass = new THREE.Mesh(new THREE.PlaneBufferGeometry(10000,10000), new THREE.MeshBasicMaterial( { color: 0x7cfc00 } ) );
	grass.position.z = -1000;
	grass.receiveShadow = true;
	scene.add(grass);
	
	//Lighting stuff
	var light = new THREE.SpotLight( 0xffffff);
	light.position.set(-25,-25,1500);
	light.castShadow = true;
	light.exponent = 0;
	light.target.position.set(0,0,0);	
	scene.add(light);
	
	//Create controllable player (You)
	var player1 = new Player(new THREE.Vector2(0, -500), new THREE.Vector2(playerWidth, playerHeight), 10, playerColorMaterial);
	player1.mesh.castShadow = true;
	scene.add(player1.mesh);
	
	renderer.render(scene, camera);
	
	var frameCount = 0; //Spawn and shoot timers
	
	function animate() {
		if(frameCount%200 == 0)
			spawnBuilding();
		
		for(var i=0; i<buildings.length; i++){
			buildings[i].position.y -= 2;
			if(buildings[i].position.y <= -1500){
				scene.remove(buildings[i]);
				buildings.splice(i,1);
			}
		}
		
		//Check keys and set up actions accordingly
		if(Key.isDown(Key.LEFT)) {
			player1.xVelocity = -5; 
			player1.rot -= Math.PI/60;
			if (player1.rot < -Math.PI/2 + .5)	player1.rot = -Math.PI/2 + .5;
		}
		if(Key.isDown(Key.RIGHT)) {
			player1.xVelocity = 5; 
			player1.rot += Math.PI/60;
			if (player1.rot > Math.PI/2  - .5) player1.rot = Math.PI/2 - .5;
		}
		if(!Key.isDown(Key.RIGHT) && !Key.isDown(Key.LEFT)) {player1.xVelocity = 0;}
		if(Key.isDown(Key.UP)) {player1.yVelocity = 5;}
		if(Key.isDown(Key.DOWN)) {player1.yVelocity = -5;}
		if(!Key.isDown(Key.UP) && !Key.isDown(Key.DOWN)) {player1.yVelocity = 0;}
		if(Key.isDown(Key.C)) {
			if(frameCount%bulletFreq == 0)
				player1.shoot();
		}
		
		//Spawn enemies every 120 frames
		if(frameCount%120 == 0)
			spawnEnemy();
		
		//Move player based on keys pressed
		player1.move();
		
		//Enemy movement + death collision
		for (var i=0; i<enemies.length; i++){
			enemies[i].mesh.rotation.x += .1;
			enemies[i].mesh.rotation.y += .1;
			enemies[i].move();	//Move enemy one frame
			
			//Check if enemies AABB collides with player AABB
			//DEATH
			if (enemies[i].AABB.collides(player1.AABB)){
				//console.log("DEATH");
				alive = false;
				div.textContent = "Points: " + points + "   GAME OVER";
				continue;
			}
			
			//Enemy out of bounds get deleted
			if(enemies[i].AABB.pos.y <= -650){
				scene.remove(enemies[i].mesh);
				enemies.splice(i,1);			
			}
		}
		
		//bullet collision, if hits both enemy + bullet get deleted
		for (var i=0; i<playerBullets.length; i++) {
			remove = false;
			playerBullets[i].move();	//Move player bullet one frame
			
			for(var j=0; j<enemies.length; j++){
				//Check if player bullet AABB collides with enemy AABB
				//HIT
				if(playerBullets[i].AABB.collides(enemies[j].AABB)){
					//console.log("HIT");	//Debug
					points++;
					div.textContent = "Points: " + points;
					//Remove enemy and bullet from game
					scene.remove(enemies[j].mesh);
					scene.remove(playerBullets[i].mesh);
					playerBullets.splice(i,1);
					enemies.splice(j,1);
					remove = true;
				}
			}
			
			//Remove bullets that reach out of bounds from the game
			//Ignore this if bullet collided with enemy
			if(!remove){
				if(playerBullets[i].AABB.pos.y >= 650){
					scene.remove(playerBullets[i].mesh);
					playerBullets.splice(i,1);
				}
			}
		}
		

		//Keep player in bounds of playing field
		set = false;
		
		if(player1.AABB.pos.x > 300){
			player1.AABB.pos.x = 300;
			set = true;
		}
		if(player1.AABB.pos.x < -300){
			player1.AABB.pos.x = -300;
			set = true;
		}
		if(player1.AABB.pos.y < -500){
			player1.AABB.pos.y = -500;
			set = true;
		}		
		if(player1.AABB.pos.y > 500){
			player1.AABB.pos.y = 500;
			set = true;
		}
		
		if(set)
			player1.setPosition();
			
		frameCount++;
		
		if(Key.isDown(Key.ONE))
			cState = true;
		if(Key.isDown(Key.TWO))
			cState = false;
		
		if(!cState){
			cp = player1.cameraPosition();		
			camera.position.set(cp.x, cp.y, cp.z);
			camera.lookAt(new THREE.Vector3(cp.x, cp.y + 250, 0));
			//camera.rotation.z += Math.PI/12;
		}
		else {
			camera.position.set(0,-100,1500);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		}

		
		renderer.render(scene, camera);
		
		if(alive)
			requestAnimationFrame(animate);
	}
	animate();
	
}