import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Github, Star, GitFork } from 'lucide-react';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const PINNED_REPOS_QUERY = `
  query PinnedRepositories($login: String!, $count: Int!) {
    user(login: $login) {
      pinnedItems(first: $count, types: REPOSITORY) {
        nodes {
          ... on Repository {
            id
            name
            description
            url
            homepageUrl
            stargazerCount
            forkCount
            primaryLanguage {
              name
            }
          }
        }
      }
    }
  }
`;

const formatCount = (value) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const githubUsername = import.meta.env.VITE_GITHUB_USERNAME || 'redac1ed';
  const githubToken = import.meta.env.VITE_GITHUB_TOKEN;

  useEffect(() => {
    const loadPinnedProjects = async () => {
      if (!githubToken) {
        setError('Missing VITE_GITHUB_TOKEN. Add it in your .env file to fetch pinned repositories.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError('');
        const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${githubToken}`,
          },
          body: JSON.stringify({
            query: PINNED_REPOS_QUERY,
            variables: {
              login: githubUsername,
              count: 6,
            },
          }),
        });
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }
        const payload = await response.json();
        if (payload.errors?.length) {
          throw new Error(payload.errors[0].message || 'Failed to fetch pinned repositories.');
        }
        const pinnedItems = payload?.data?.user?.pinnedItems?.nodes || [];
        const mappedProjects = pinnedItems.map((repo) => ({
          id: repo.id,
          title: repo.name,
          description: repo.description || 'No description provided.',
          tags: [
            ...(repo.primaryLanguage?.name ? [repo.primaryLanguage.name] : [])
          ].slice(0, 4),
          links: {
            github: repo.url,
            demo: repo.homepageUrl || '',
          },
          stats: {
            stars: formatCount(repo.stargazerCount),
            forks: formatCount(repo.forkCount),
          },
        }));

        setProjects(mappedProjects);
      } catch (fetchError) {
        setError(fetchError.message || 'Unable to fetch pinned repositories.');
      } finally {
        setIsLoading(false);
      }
    };
    loadPinnedProjects();
  }, [githubToken, githubUsername]);

  return (
    <section id="projects" className="projects-section">
      <div className="projects-bg" />
      <div className="section-container">
        <motion.div 
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="section-heading"
        >
          <h2 className="section-title">
            Featured <span className="section-title-gradient">Projects</span>
          </h2>
          <p className="section-subtitle">
            From web platforms to games and utilities.
          </p>
        </motion.div>

        {isLoading && (
          <div className="status-text status-text--neutral">Loading pinned projects...</div>
        )}
        {error && (
          <div className="status-text status-text--error">{error}</div>
        )}

        {!isLoading && !error && projects.length > 0 && (
          <div className="projects-grid">
            {projects.map((project, index) => (
            <motion.div
              key={project.id || index}
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="project-card"
            >
              <div className="project-card-glow" />
              <div className="project-card-body">
                <div className="project-card-top">
                  <h3 className="project-card-title">
                    {project.title}
                  </h3>
                </div>
                <div className="project-links">
                    {project.links.github && (
                      <motion.a 
                        whileTap={{ scale: 0.9 }}
                        href={project.links.github} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="project-link"
                      >
                        <Github className="icon icon-md" />
                      </motion.a>
                    )}
                    {project.links.demo && (
                      <motion.a 
                        whileTap={{ scale: 0.9 }}
                        href={project.links.demo} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="project-link"
                      >
                        <ExternalLink className="icon icon-md" />
                      </motion.a>
                    )}
                </div>
                <p className="project-description">
                  {project.description}
                </p>

                <div className="project-tags">
                  {project.tags.map((tag, i) => (
                    <span key={i} className="project-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="project-stats">
                  <div className="project-stat-item">
                    <Star className="icon icon-base" />
                    <span className="project-stat-value">{project.stats.stars}</span>
                  </div>
                  <div className="project-stat-item">
                    <GitFork className="icon icon-base" />
                    <span className="project-stat-value">{project.stats.forks}</span>
                  </div>
                </div>
              </div>
            </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
