const WIDTH = 432
const HEIGHT = 304
const TILE_SIZE = 16
const GRAVITY = 1000
const PLAYER_JUMP = 550
const PLAYER_SPEED = 200
const PLAYER_OFFSET = {r:20,x:5,y:10}   //collision offset
const GROUND_Y = TILE_SIZE*17.5
const PLAYER_Y = GROUND_Y - (PLAYER_OFFSET.y + PLAYER_OFFSET.r) + 1 //prevent sterturing
const POWER_DUR = 500
const POWER_COOLTIME = 1000
const BALL_SPEED = 1
const REALISTIC = false



var fps = 60
var player
var ball
var cursors
var ground_group
var ground
var position = 1    //0 = left, 1 = right
var status = 'jump'          //jump, walk, slide, power
var has_control = true
var power_active = false
var power_cooling = false
var ball_power = 1
var sounds = {}
var bgm
var phy
var round_hit = 0
var game_speed = 1


var config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    fps: {
        target: fps,
        forceSetTimeOut: true
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // audio: {disableWebAudio: false},
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    }
}


var game = new Phaser.Game(config);
var s
var test

function preload ()
{
    phy = this.physics
    s = this
    this.load.spritesheet('sprite_pikachu','bmp/pikachu.png', {
        frameWidth: 64,
        frameHeight: 64,
    })

    this.load.spritesheet('sprite_ball','bmp/ball.png', {
        frameWidth: 40,
        frameHeight: 40
    })

    this.load.image('sprite_bg','bmp/bg.png')

    this.load.audio('sound_bgm','wav/bgm.mp3')
    this.load.audio('sound_beep','wav/beep.wav')
    this.load.audio('sound_ground','wav/ground.wav')
    this.load.audio('sound_hit','wav/hit.wav')
    this.load.audio('sound_power','wav/power.wav')
    this.load.audio('sound_select','wav/select.wav')
    this.load.audio('sound_chu','wav/chu.wav')
    this.load.audio('sound_win','wav/win.wav')

}


async function create ()
{
    //var frame = texture.add(frameName, sourceIndex, x, y, width, height);
    var bg_texture = this.textures.get('sprite_bg')
    bg_texture.add('sand',0, 0,0,16,16)
    bg_texture.add('sky',0, 16,0,16,16)
    bg_texture.add('net_top',0, 32,0,8,8)
    bg_texture.add('net_stick',0, 32,8,8,8)
    bg_texture.add('ground_left',0, 40,0,16,16)
    bg_texture.add('ground_center',0, 56,0,16,16)
    bg_texture.add('ground_right',0, 72,0,16,16)
    bg_texture.add('ground_top',0, 88,0,16,16)
    bg_texture.add('cloud',0, 0,16,46,21)
    bg_texture.add('mountain',0, 0,40,432,72)
    

    this.add.tileSprite(0, 0, WIDTH, TILE_SIZE*12, 'sprite_bg', 'sky').setDisplayOrigin(0,0)
    this.add.tileSprite(0, TILE_SIZE*11.5, WIDTH, 80, 'sprite_bg', 'mountain').setDisplayOrigin(0,0)
    this.add.tileSprite(0, HEIGHT - TILE_SIZE*2, WIDTH, TILE_SIZE*2, 'sprite_bg', 'sand').setDisplayOrigin(0,0)
    this.add.tileSprite(0, TILE_SIZE*15.5, WIDTH, TILE_SIZE, 'sprite_bg', 'ground_top').setDisplayOrigin(0,0)
    this.add.tileSprite(0, TILE_SIZE*16.5, WIDTH, TILE_SIZE, 'sprite_bg', 'ground_center').setDisplayOrigin(0,0)
    this.add.tileSprite(0, TILE_SIZE*16.5, TILE_SIZE, TILE_SIZE, 'sprite_bg', 'ground_left').setDisplayOrigin(0,0)
    this.add.tileSprite(WIDTH-TILE_SIZE, TILE_SIZE*16.5, TILE_SIZE, TILE_SIZE, 'sprite_bg', 'ground_right').setDisplayOrigin(0,0)
    ground_group = this.physics.add.staticGroup();
    ground = ground_group.create(-TILE_SIZE, TILE_SIZE*17.5, 'sprite_bg', 'sand').setDisplayOrigin(0,0).setScale(WIDTH/TILE_SIZE + 2,1).setAlpha(0).refreshBody()
    
    ///////////////////////* ball *////////////////////////

    var ball_texture = this.textures.get('sprite_ball')
    ball_texture.add('ball',0, 0,0,40,40)
    ball_texture.add('hit',0, 0,40,40,40)
    ball_texture.add('half_trans',0, 40,40,40,40)
    ball_texture.add('blue',0, 80,40,40,40)
    
    ball = this.physics.add.sprite(200,200,'sprite_ball', 'ball')
    ball.setCollideWorldBounds(true)
    ball.body.onWorldBounds = true
    ball.setBounce(1)
    ball.setGravityY(GRAVITY*0.5)
    ball.setVelocityY(200)
    ball.body.setAllowRotation()
    ball.setDepth(5)

    this.anims.create({
        key: 'anim_power_ball',
        frames: this.anims.generateFrameNumbers('sprite_ball', { start: 6, end: 7 }),
        frameRate: 30,
        repeat: 0
    });


    ///////////////////////* cloud *////////////////////////

    // var cloud = this.add.image(50,50,'sprite_bg','cloud')
    var clouds_a = []
    var clouds_b = []
    for(var i=0;i<10;i++){
        var cloud = this.add.image(Phaser.Math.Between(-WIDTH, 0),Phaser.Math.Between(0, HEIGHT/3) ,'sprite_bg','cloud')
        clouds_a.push(cloud)
        var cloud = this.add.image(Phaser.Math.Between(-WIDTH, 0),Phaser.Math.Between(0, HEIGHT/3) ,'sprite_bg','cloud')
        clouds_b.push(cloud)
    }

    this.tweens.add({
        targets     : clouds_a,
        duration: 200,
        repeat: -1,
        yoyo: true,
        props: {
            x: {value: '+=' + String(WIDTH*2), duration: 6000, ease: 'Linear', yoyo: false},
            scaleX: 1.2,
            scaleY: 1.2,
        }
    });

    this.tweens.add({
        delay: 3000,
        targets     : clouds_b,
        duration: 200,
        repeat: -1,
        yoyo: true,
        props: {
            x: {value: '+=' + String(WIDTH*2), duration: 6000, ease: 'Linear', yoyo: false},
            scaleX: 1.2,
            scaleY: 1.2,
        }
    });

    ///////////////////////* player pikachu *////////////////////////

    player = this.physics.add.sprite(100, 100, 'sprite_pikachu')
    player.setCollideWorldBounds(true)
    player.body.setGravityY(GRAVITY)
    player.setBounce(0)
    
    if (position) player.flipX = true
    
    ///////////////////////* animations *////////////////////////

    this.anims.create({
        key: 'anim_walk',
        frames: this.anims.generateFrameNumbers('sprite_pikachu', { start: 0, end: 4 }),
        frameRate: 10,
        yoyo: true,
        repeat: -1
    });

    this.anims.create({
        key: 'anim_jump',
        frames: this.anims.generateFrameNumbers('sprite_pikachu', { start: 5, end: 7 }),    //5 to 9
        frameRate: 20,
        yoyo: true,
        repeat: -1
    });

    this.anims.create({
        key: 'anim_power',
        frames: this.anims.generateFrameNumbers('sprite_pikachu', { start: 10, end: 14 }),
        frameRate: 10,
        repeat: 0
    });

    this.anims.create({
        key: 'anim_slide',
        frames: this.anims.generateFrameNumbers('sprite_pikachu', { start: 15, end: 17 }),
        frameRate: 10,
        repeat: 0
    });

    this.anims.create({
        key: 'anim_win',
        frames: this.anims.generateFrameNumbers('sprite_pikachu', { start: 20, end: 24 }),
        frameRate: 10,
        repeat: 0
    });

    this.anims.create({
        key: 'anim_lose',
        frames: this.anims.generateFrameNumbers('sprite_pikachu', { start: 25, end: 29 }),
        frameRate: 10,
        repeat: 0
    });


    ///////////////////////* sound *////////////////////////

    bgm = this.sound.add('sound_bgm',{loop: true})
    // bgm.play()
    sounds['chu'] = this.sound.add('sound_chu')
    sounds['power'] = this.sound.add('sound_power')


    cursors = this.input.keyboard.createCursorKeys()

    ///////////////////////* physics *////////////////////////

    this.physics.add.collider(ball, ground)
    this.physics.add.overlap(player, ball, hit_ball, null, this)
    this.physics.add.overlap(player, ground, on_ground)
    this.physics.world.on('worldbounds', world_bound)
    // player.body.setCircle(32,0,0)
    player.body.setCircle(25,5,10)
    ball.body.setCircle(20,0,0)
    

}

function update()
{
    

    // if (player.body.touching.down){
        
    // }
    // else{
        
    // }

    if (ball_power === 2){
        ball_after_image(this)
    }


    if (has_control){
        player.anims.play('anim_' + status, true)

        if (cursors.down.isDown)
        {
            ball.x = 100
            ball.y = 100
            
        }


        if (cursors.left.isDown)
        {
            player.setVelocityX(-PLAYER_SPEED);
        }
        else if (cursors.right.isDown)
        {
            player.setVelocityX(PLAYER_SPEED);
        }
        else
        {
            player.setVelocityX(0);
        }

        if (cursors.up.isDown && status === 'walk')
        {
            status = 'jump'
            player.setVelocityY(-PLAYER_JUMP);
            sounds['chu'].play()
        }

        if (cursors.space.isDown && status === 'jump' && power_cooling === false){
            sounds['power'].play()
            status = 'power'
            power_cooling = true
            power_active = true
            this.time.delayedCall(POWER_COOLTIME/game_speed, () => {power_cooling = false})
            this.time.delayedCall(POWER_DUR/game_speed, () => {
                power_active = false
                if (status === 'power') status = 'jump'
            })
        }

        
    }


    
}

function world_bound(body, blockedUp, blockedDown, blockedLeft, blockedRight){
    //only ball object can enter this function
    body.velocity
}

function on_ground(player, ball){
    status = 'walk'
    power_active = false
    player.y = PLAYER_Y
    player.setVelocityY(0)
}


async function hit_ball(player, ball){

    
    if (ball.body.wasTouching.none === false) return;
    
    //speed up
    round_hit += 1
    if (round_hit > 50){
        change_game_speed(this, game_speed + 0.01)
        bgm.rate += 0.01
    }
    

    if (power_active === true){
        ball_power = 2
    }
    else if (ball_power === 2){
        ball_power = 0.75
    }
    else if (ball_power === 0.75){
        ball_power = 0.875
    }
    else{   // 0.875 -> 1
        ball_power = 1
    }


    if (REALISTIC === true){
        var angle = Phaser.Math.Angle.BetweenPoints(player, ball)

        var ball_vector = new Phaser.Math.Vector2(ball.body.velocity)
        var player_vector = new Phaser.Math.Vector2(player.body.velocity)
        var bounce = this.physics.velocityFromRotation(angle,ball_vector.length() + player_vector.length()*Math.abs(Math.sin(angle/2)))
        
        ball.setVelocity(bounce.x,bounce.y)
        
    }
    else{
        var amp = 1.5
        var base_velocity = 100
        var angle_bonus = 150
        var angle = Phaser.Math.Angle.BetweenPoints(player, ball)

        var bounce = this.physics.velocityFromRotation(angle,BALL_SPEED*ball_power*(base_velocity + ball.y*amp + angle_bonus*Math.abs(Math.abs(angle)-Math.PI/2)))


        ball.setVelocity(bounce.x,bounce.y)
        ball.body.angularVelocity = ball.body.speed * bounce.x/Math.abs(bounce.x)
    }
    
    
}

function ball_after_image(scene){
    var bai = scene.add.sprite(ball.x,ball.y,'sprite_ball','ball')
    bai.anims.play('anim_power_ball', false)
    bai.once('animationcomplete', () => {
        bai.destroy()
    })
}

function ball_hit_image(scene){
    //game.add.tween(sprite.scale).to( { x: 2, y: 2 }, 2000, Phaser.Easing.Linear.None, true);
    var hit = scene.add.sprite(ball.x,ball.y,'sprite_ball','hit')
    bai.anims.play('anim_power_ball', false)
    bai.once('animationcomplete', () => {
        bai.destroy()
    })
}


function change_game_speed(scene, speed){
    game_speed = speed
    scene.physics.world.timeScale = 1/game_speed
    
}



function slowdown(scene, bool){
    if (bool)
        scene.physics.world.timeScale = 2
    else
        scene.physics.world.timeScale = 1
}


function predict_height(t){     //t = rtt
    var height = -PLAYER_JUMP*t + GRAVITY/2*t*t
    var velocityY = -PLAYER_JUMP + GRAVITY*t
    if (height > 0)
        height = 0
    else
        height = height/2
    return {h:height, v:velocityY}
}