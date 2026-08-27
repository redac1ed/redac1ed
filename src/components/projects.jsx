import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';

const PROJECTS = [
	{
		title: 'redac.me',
		category: 'Interactive portfolio',
		description: 'A cinematic portfolio built around a real-time 3D scene, animated transitions, and physics-driven interfaces.',
		image: '/intro.png',
		technologies: ['React', 'Three.js', 'Cannon.js'],
		href: 'https://redac.me',
	},
	{
		title: 'Anime Showcase',
		category: 'Media experience',
		description: 'A wheel-controlled 3D video carousel that keeps playback and audio focused on the active title.',
		image: '/animes.png',
		technologies: ['React', 'HTML Video', 'CSS 3D'],
	},
	{
		title: 'Chain Cards',
		category: 'Physics experiment',
		description: 'A draggable card wall connected by simulated metal chains, rendered with a custom canvas layer.',
		image: '/likes.png',
		technologies: ['Cannon.js', 'Canvas', 'Anime.js'],
	},
	{
		title: 'Shrine Environment',
		category: 'Real-time 3D',
		description: 'An adaptive Three.js environment with custom shaders, particles, camera choreography, and a static fallback.',
		image: '/gojo.png',
		technologies: ['R3F', 'GLSL', 'Drei'],
	},
];

const normalizeIndex = (index, length) => ((index % length) + length) % length;

export default function ProjectCarousel({ active, onClose, projects = PROJECTS }) {
	const [rotation, setRotation] = useState(0);
	const stageRef = useRef(null);
	const scrollLockRef = useRef(false);
	const projectCount = projects.length;
	const step = projectCount > 0 ? 360 / projectCount : 0;
	const currentIndex = projectCount > 0
		? normalizeIndex(Math.round(rotation / step), projectCount)
		: 0;

	useEffect(() => {
		const stage = stageRef.current;
		if (!active || !stage || projectCount < 2) return;

		const handleWheel = (event) => {
			event.preventDefault();
			if (scrollLockRef.current) return;

			const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
				? event.deltaY
				: event.deltaX;
			if (delta === 0) return;

			scrollLockRef.current = true;
			window.setTimeout(() => {
				scrollLockRef.current = false;
			}, 700);
			setRotation((previous) => previous + (delta > 0 ? step : -step));
		};

		stage.addEventListener('wheel', handleWheel, { passive: false });
		return () => stage.removeEventListener('wheel', handleWheel);
	}, [active, projectCount, step]);

	useEffect(() => {
		if (!active) return;

		const handleKeyDown = (event) => {
			if (event.key === 'ArrowRight') {
				setRotation((previous) => previous + step);
			} else if (event.key === 'ArrowLeft') {
				setRotation((previous) => previous - step);
			} else if (event.key === 'Escape') {
				onClose?.();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [active, onClose, step]);

	if (!active) return null;

	const rotatePrevious = () => setRotation((previous) => previous - step);
	const rotateNext = () => setRotation((previous) => previous + step);
	const stopPropagation = (event) => event.stopPropagation();

	return (
		<section
			className="projects-overlay"
			aria-label="Featured projects"
			onMouseDown={stopPropagation}
			onMouseMove={stopPropagation}
			onMouseUp={stopPropagation}
			onTouchStart={stopPropagation}
			onTouchMove={stopPropagation}
			onTouchEnd={stopPropagation}
		>
			<button
				type="button"
				className="projects-close-button"
				onClick={onClose}
				aria-label="Close projects"
			>
				<X aria-hidden="true" />
			</button>

			<div ref={stageRef} className="projects-carousel-stage">
				{projectCount > 0 ? (
					<div
						className="projects-carousel-ring"
						style={{ transform: `translateZ(calc(var(--projects-carousel-radius) * -1)) rotateY(${-rotation}deg)` }}
					>
						{projects.map((project, index) => {
							const angle = index * step;
							const isCurrent = index === currentIndex;

							return (
								<article
									key={project.title}
									className={`projects-carousel-item${isCurrent ? ' is-current' : ''}`}
									style={{ transform: `rotateY(${angle}deg) translateZ(var(--projects-carousel-radius))` }}
									aria-hidden={!isCurrent}
								>
									<div className="project-card-media">
										<img
											src={project.image}
											alt={`${project.title} preview`}
											loading="lazy"
											draggable="false"
										/>
										<span className="project-card-index">
											{String(index + 1).padStart(2, '0')}
										</span>
									</div>
									<div className="project-card-content">
										<p className="project-card-category">{project.category}</p>
										<h2>{project.title}</h2>
										<p className="project-card-description">{project.description}</p>
										<ul className="project-card-technologies" aria-label="Technologies">
											{project.technologies.map((technology) => (
												<li key={technology}>{technology}</li>
											))}
										</ul>
										{project.href && (
											<a
												href={project.href}
												target="_blank"
												rel="noreferrer"
												tabIndex={isCurrent ? 0 : -1}
											>
												View project
												<ExternalLink aria-hidden="true" />
											</a>
										)}
									</div>
								</article>
							);
						})}
					</div>
				) : (
					<p className="projects-empty-state">No projects to display.</p>
				)}
			</div>

			{projectCount > 1 && (
				<div className="projects-carousel-controls">
					<button type="button" onClick={rotatePrevious} aria-label="Previous project">
						<ChevronLeft aria-hidden="true" />
					</button>
					<span aria-live="polite">
						{String(currentIndex + 1).padStart(2, '0')}
						<span>/</span>
						{String(projectCount).padStart(2, '0')}
					</span>
					<button type="button" onClick={rotateNext} aria-label="Next project">
						<ChevronRight aria-hidden="true" />
					</button>
				</div>
			)}
		</section>
	);
}
