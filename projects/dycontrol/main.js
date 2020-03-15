let num_states = 10;
let num_people = 40;
let turbulence = 0;
let speed_limit = 10;
let reinforcement = 0.1;
let origin_size = 100;
let damping_factor = 0.90;
let starting_radius = 10;
let max_transition_probability = 0.990;
let min_transition_probability = 0.2;
let spritesheet_width = 10;
let spritesheet_height = 10;
let spritesheet_elem_width = 20;
let spritesheet_elem_height = 20;

document.body.setAttribute("style", "overflow: hidden");

let world = document.getElementById("world");
let curr_states;
let positions_x;
let positions_y;
let speeds_x;
let speeds_y;
let speeds_forward;
let accelerations_x;
let accelerations_y;
let accelerations_forward;
let accelerations_rotating;
let rotations;
let steerings;
let radiuses;
let avoiding_people;
let chains;
let sprites;
let prev_time;
let curr_time;
let spritesheet = document.getElementById("spritesheet");
let sprite_palette;
let speed_control = document.getElementById("speed_control");
let squared = (value) => value * value;
let target_fps = squared(speed_control.value);
speed_control.addEventListener("input", function(event){
	target_fps = squared(parseFloat(event.target.value));
});
let reinforcement_control = document.getElementById("reinforcement_control");
reinforcement_control.addEventListener("input", function(event){
	reinforcement = parseFloat(event.target.value);
});
function centered_random(max, offset = 0) {
	return Math.random() * max - max / 2 + offset; 
}
function hypotenuse(a, b) {
	return Math.sqrt(a * a + b * b);	
}
function euclidean_distance(x1, y1, x2, y2) {
	return hypotenuse(x2 - x1, y2 - y1);
}
function init() {
	sprite_palette = new Array(num_states);
	curr_states = new Array(num_people);
	chains = new Array(num_people);
	sprites = new Array(num_people);
	positions_x = new Array(num_people);
	positions_y = new Array(num_people);
	speeds_x = new Array(num_people);
	speeds_y = new Array(num_people);
	speeds_forward = new Array(num_people);
	accelerations_x = new Array(num_people);
	accelerations_y = new Array(num_people);
	accelerations_forward = new Array(num_people);
	accelerations_rotating = new Array(num_people);
	rotations = new Array(num_people);
	radiuses = new Array(num_people);
	avoiding_people = new Array(num_people);
	for (let p = 0; p < num_people; p++) {
		let chain = new Array(num_states);
		sprites[p] = document.createElement("div");
		world.appendChild(sprites[p]);
		chains[p] = chain;
	 	curr_states[p] = Math.floor(Math.random() * num_states);
	 	positions_x[p] = centered_random(origin_size);
	 	positions_y[p] = centered_random(origin_size);
	 	speeds_x[p] = 0;
	 	speeds_y[p] = 0;
	 	speeds_forward[p] = 0;
	 	accelerations_x[p] = 0;
	 	accelerations_y[p] = 0;
	 	accelerations_forward[p] = 0;
	 	accelerations_rotating[p] = 0;
		rotations[p] = centered_random(Math.PI);
	 	radiuses[p] = 3 * hypotenuse(spritesheet_elem_width, spritesheet_elem_height);
	 	avoiding_people[p] = new Array();
		for (let i = 0; i < num_states; i++) {
			let sprite_choice;
			do {
				sprite_choice = Math.floor(Math.random() * 30 * 30);
			} while (sprite_palette.includes(sprite_choice))
			sprite_palette[i] = sprite_choice;
			chain[i] = new Array(num_states);
			let evenly_divided_probability = 1 / num_states;
			let random_probabilities = new Array(num_states);
			for (let j = 0; j < num_states; j++) {
				random_probabilities[j] = centered_random(evenly_divided_probability);
			}
			evenly_divided_probability -= random_probabilities.reduce((a, b) => a + b, 0) / num_states;
			for (let j = 0; j < num_states; j++) {
				chain[i][j] = evenly_divided_probability + random_probabilities[j];
			}
		}
	}
	let target_frame_time = 1000.0 / target_fps;
	prev_time = Date.now() - target_frame_time - 0.0001;
	update();
}
function find_people_in_radius(my_index, radius) {
	let found = new Array();
	for (let p = 0; p < num_people; p++) {
		if (p != my_index) {
			let distance = euclidean_distance(positions_x[my_index], positions_x[p], positions_y[my_index], positions_y[p]);
			if (distance < radius) {
				found.push(p);
			}
		}
	}
	return found;
}
function update() {
	curr_time = Date.now();
	let delta = curr_time - prev_time;
	let target_frame_time = 1000.0 / target_fps;
	if (delta > target_frame_time) {
		for (let p = 0; p < num_people; p++) {
			let chain = chains[p];
			let curr_state = curr_states[p];
			let pos_x = positions_x[p];
			let pos_y = positions_y[p];
			let sprite = sprites[p];
			let transition_index = Math.random();
			let sum = 0;
			for (let i = 0; i < num_states; i++) {
				let transition_probability = chain[curr_state][i];
				sum += transition_probability;
				if (transition_index < sum) {
					let next_state = i;
					if (curr_state != i) {
						chain[curr_state][i] += reinforcement;
						if (chain[curr_state][i] > max_transition_probability) {
							chain[curr_state][i] = max_transition_probability;
						}
						for (let j = 0; j < num_states; j++) {
							if (j != i) {
								if (chain[curr_state][j] < min_transition_probability) {
									chain[curr_state][j] = min_transition_probability;
								}
							}
						}
						// normalize
						let other_sum = chain[curr_state].reduce((a, b) => a + b, 0);
						for (let j = 0; j < num_states; j++) {
							chain[curr_state][j] /= other_sum;
						}
					}
					curr_state = next_state;
					break;
				}
			}
			let close_people = find_people_in_radius(p, radiuses[p]);
			for (let c = 0; c < close_people.length; c++) {
				if (curr_states[close_people[c]] == curr_states[p]) {
					let dx = positions_x[p] - positions_x[close_people[c]];
					let dy = positions_y[p] - positions_y[close_people[c]];
					accelerations_forward[p] = speed_limit - hypotenuse(speeds_x[p], speeds_y[p]);
					accelerations_rotating[p] = Math.atan2(dx, dy) / 20;
				}
			}
			accelerations_x[p] = centered_random(turbulence);
			accelerations_y[p] = centered_random(turbulence);
			accelerations_rotating[p] *= damping_factor;
			rotations[p] += accelerations_rotating[p];
			rotations[p] = rotations[p] - Math.floor(rotations[p] / Math.PI) * Math.PI + Math.PI % Math.PI - Math.PI;
			accelerations_forward[p] *= damping_factor;
			speeds_forward[p] += accelerations_forward[p];
			speeds_forward[p] *= damping_factor;
			accelerations_x[p] += Math.cos(rotations[p]) * speeds_forward[p];
			accelerations_y[p] += Math.sin(rotations[p]) * speeds_forward[p];
			speeds_x[p] += accelerations_x[p];
			speeds_y[p] += accelerations_y[p];
			speeds_x[p] *= damping_factor;
			speeds_y[p] *= damping_factor;
			let speed = hypotenuse(speeds_x[p], speeds_y[p]);
			if (speed > speed_limit) {
				speeds_x[p] = speeds_x[p] / speed * speed_limit;
				speeds_y[p] = speeds_y[p] / speed * speed_limit;
			}
			positions_x[p] += speeds_x[p];
			positions_y[p] += speeds_y[p];
			if (positions_x[p] < -window.innerWidth / 2) {
				positions_x[p] = +window.innerWidth / 2;
			}
			if (positions_y[p] < -window.innerHeight / 2) {
				positions_y[p] = +window.innerHeight / 2;
			}
			if (positions_x[p] > +window.innerWidth / 2 - spritesheet_elem_width) {
				positions_x[p] = -window.innerWidth / 2;
			}
			if (positions_y[p] > +window.innerHeight / 2 - spritesheet_elem_height) {
				positions_y[p] = -window.innerHeight / 2;
			}
			let sprite_x = sprite_palette[curr_state] % spritesheet_width;
			let sprite_y = Math.floor(sprite_palette[curr_state] / spritesheet_width);
			sprite.setAttribute("style", "background-position: -" + sprite_x * spritesheet_elem_width + "px -" + sprite_y * spritesheet_elem_height + "px; width: " + spritesheet_elem_width + "px; height: " + spritesheet_elem_height + "px; background-image: url(./spritesheet.png); position: absolute; margin-left: " + (window.innerWidth / 2 + pos_x) + "px; margin-top: " + (window.innerHeight / 2 + pos_y) + "px");
		}
		prev_time = curr_time;
	}
	requestAnimationFrame(update);
}
init();