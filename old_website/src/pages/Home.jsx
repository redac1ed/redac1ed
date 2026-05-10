import Hero from '../components/home/Hero';
import Skills from '../components/home/Skills';
import Stats from '../components/home/Stats';

export default function Home() {
  return (
    <div className="page-home-root">
      <Hero />
      <Skills />
      <Stats />
    </div>
  );
}
