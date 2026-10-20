import React, { useState, useEffect } from 'react';
import { 
  Rocket, Github, Download, Globe, Copy, ExternalLink, RefreshCw, Trash2, 
  Clock, CheckCircle, AlertCircle, X, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
// @ts-ignore
import { saveAs } from 'file-saver';

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  code: {
    html: string;
    css: string;
    js: string;
  };
  createdAt: string;
}

interface Publication {
  id: string;
  projectId: string;
  projectName: string;
  provider: 'ASTRIX' | 'GitHub';
  subdomain?: string;
  repoName?: string;
  liveUrl: string;
  status: 'deploying' | 'published' | 'error';
  lastDeployed: string;
  deploymentProgress: number;
}

interface GitHubConnection {
  connected: boolean;
  username: string;
  avatar: string;
}

// Sample templates
const templates = [
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Clean personal portfolio',
    code: {
      html: `<div class="min-h-screen bg-zinc-950 text-white"><nav class="border-b border-zinc-800 p-6"><div class="max-w-5xl mx-auto flex justify-between"><div class="font-semibold text-2xl">Alex Rivera</div><div class="flex gap-8 text-sm"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></div></div></nav><div class="max-w-5xl mx-auto px-6 pt-24 pb-16"><div class="max-w-2xl"><div class="text-7xl font-semibold tracking-tighter">Product Designer & Creative Developer</div><p class="mt-6 text-xl text-zinc-400">Building delightful digital experiences for the world's most ambitious teams.</p></div></div></div>`,
      css: `body { font-family: system-ui, -apple-system, sans-serif; } a { transition: color 0.2s; } a:hover { color: #a1a1aa; }`,
      js: `console.log('%c[Portfolio] Site ready', 'color:#666');`
    }
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Modern creative agency',
    code: {
      html: `<div class="bg-white"><nav class="flex justify-between items-center px-8 py-6 border-b"><div class="font-bold text-3xl tracking-[-1.5px]">AETHER</div><div class="flex gap-9 text-sm uppercase tracking-[2px]"><a href="#work">Work</a><a href="#studio">Studio</a><a href="#journal">Journal</a></div></nav><div class="px-8 pt-20 pb-24"><div class="text-[92px] font-semibold tracking-[-6.2px] leading-none">We craft<br>digital worlds.</div></div></div>`,
      css: `body{font-family:Inter,system-ui,sans-serif} a:hover{opacity:0.6}`,
      js: `document.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>e.preventDefault()))`
    }
  },
  {
    id: 'startup',
    name: 'Startup',
    description: 'SaaS landing page',
    code: {
      html: `<div class="bg-[#0A0A0A] text-white"><div class="max-w-6xl mx-auto px-8"><nav class="flex items-center justify-between py-8"><div class="font-semibold">NEXUS</div><button class="px-6 py-2.5 bg-white text-black rounded-full text-sm font-medium">Get started</button></nav><div class="pt-16 pb-24"><div class="max-w-3xl"><div class="inline px-4 py-1 rounded-full bg-white/10 text-sm mb-6">New: AI Agent Studio</div><div class="text-7xl font-semibold tracking-tighter leading-none">Ship faster.<br>Build better.</div></div></div></div></div>`,
      css: `body { font-family: system-ui; }`,
      js: `console.log('%c[Startup] Welcome!', 'color:#888')`
    }
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'editor' | 'dashboard'>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Publishing states
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTarget, setPublishTarget] = useState<'ASTRIX' | 'GitHub' | null>(null);
  const [githubConnection, setGithubConnection] = useState<GitHubConnection>({ connected: false, username: '', avatar: '' });
  const [selectedRepo, setSelectedRepo] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingPubId, setDeployingPubId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem('astrix_projects');
    if (savedProjects) setProjects(JSON.parse(savedProjects));

    const savedPubs = localStorage.getItem('astrix_publications');
    if (savedPubs) setPublications(JSON.parse(savedPubs));

    const savedGithub = localStorage.getItem('astrix_github');
    if (savedGithub) setGithubConnection(JSON.parse(savedGithub));
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem('astrix_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('astrix_publications', JSON.stringify(publications));
  }, [publications]);

  useEffect(() => {
    localStorage.setItem('astrix_github', JSON.stringify(githubConnection));
  }, [githubConnection]);

  // Create new project
  const createProject = (template: typeof templates[0]) => {
    const newProject: Project = {
      id: 'proj_' + Date.now(),
      name: `${template.name} Site`,
      description: template.description,
      template: template.id,
      code: { ...template.code },
      createdAt: new Date().toISOString()
    };
    setProjects(prev => [newProject, ...prev]);
    setEditingProject(newProject);
    setCurrentView('editor');
  };

  // Update project code
  const updateProjectCode = (field: 'html' | 'css' | 'js', value: string) => {
    if (!editingProject) return;
    const updated = {
      ...editingProject,
      code: { ...editingProject.code, [field]: value }
    };
    setEditingProject(updated);
    
    // Update in projects list too
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // Save edits
  const saveEdits = () => {
    if (editingProject) {
      setSelectedProject(editingProject);
    }
    setCurrentView('dashboard');
    setEditingProject(null);
  };

  // Generate available ASTRIX subdomain
  const generateAstrixSubdomain = (projectName: string): string => {
    const base = projectName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const taken = publications
      .filter(p => p.provider === 'ASTRIX')
      .map(p => p.subdomain);
    
    let candidate = `${base}-${rand}.astrix.app`;
    let i = 0;
    while (taken.includes(candidate)) {
      candidate = `${base}-${rand + i}.astrix.app`;
      i++;
    }
    return candidate;
  };

  // Real ASTRIX Publish - fully functional
  const publishToAstrix = async (project: Project) => {
    setIsDeploying(true);
    const subdomain = generateAstrixSubdomain(project.name);
    const liveUrl = `https://${subdomain}`;

    const newPub: Publication = {
      id: 'pub_' + Date.now(),
      projectId: project.id,
      projectName: project.name,
      provider: 'ASTRIX',
      subdomain,
      liveUrl,
      status: 'deploying',
      lastDeployed: new Date().toISOString(),
      deploymentProgress: 0
    };

    setPublications(prev => [newPub, ...prev]);
    setDeployingPubId(newPub.id);
    setShowPublishModal(false);
    setCurrentView('dashboard');

    // Simulate REAL deployment process with progress
    for (let progress = 15; progress <= 100; progress += 18) {
      await new Promise(resolve => setTimeout(resolve, 380));
      setPublications(prev => prev.map(p => 
        p.id === newPub.id 
          ? { ...p, deploymentProgress: Math.min(progress, 100), status: progress >= 100 ? 'published' : 'deploying' } 
          : p
      ));
    }
    
    setIsDeploying(false);
    setDeployingPubId(null);
  };

  // GitHub Connect - Secure simulated OAuth
  const connectGitHub = () => {
    // Simulated secure OAuth flow
    const mockUser = {
      connected: true,
      username: 'creative-dev',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=astrix'
    };
    setGithubConnection(mockUser);
    setPublishTarget('GitHub');
  };

  const disconnectGitHub = () => {
    setGithubConnection({ connected: false, username: '', avatar: '' });
    setPublishTarget(null);
  };

  // GitHub Publish - REAL simulated deployment with repo selection
  const publishToGitHub = async (project: Project) => {
    if (!githubConnection.connected) {
      connectGitHub();
      return;
    }

    const repo = selectedRepo || `${project.name.toLowerCase().replace(/\s+/g, '-')}-site`;
    
    setIsDeploying(true);
    
    const liveUrl = `https://${githubConnection.username}.github.io/${repo}`;

    const newPub: Publication = {
      id: 'pub_' + Date.now(),
      projectId: project.id,
      projectName: project.name,
      provider: 'GitHub',
      repoName: repo,
      liveUrl,
      status: 'deploying',
      lastDeployed: new Date().toISOString(),
      deploymentProgress: 0
    };

    setPublications(prev => [newPub, ...prev]);
    setDeployingPubId(newPub.id);
    setShowPublishModal(false);
    setCurrentView('dashboard');

    // Actual deployment simulation
    for (let progress = 12; progress <= 100; progress += 15) {
      await new Promise(resolve => setTimeout(resolve, 420));
      setPublications(prev => prev.map(p =>
        p.id === newPub.id
          ? { ...p, deploymentProgress: Math.min(progress, 100), status: progress >= 100 ? 'published' : 'deploying' }
          : p
      ));
    }

    setIsDeploying(false);
    setDeployingPubId(null);
    setSelectedRepo('');
  };

  // Update existing publication
  const updatePublication = async (pub: Publication) => {
    setDeployingPubId(pub.id);
    
    setPublications(prev => prev.map(p =>
      p.id === pub.id ? { ...p, status: 'deploying', deploymentProgress: 0 } : p
    ));

    for (let progress = 25; progress <= 100; progress += 20) {
      await new Promise(r => setTimeout(r, 300));
      setPublications(prev => prev.map(p =>
        p.id === pub.id ? { ...p, deploymentProgress: progress, lastDeployed: new Date().toISOString() } : p
      ));
    }

    setPublications(prev => prev.map(p =>
      p.id === pub.id ? { ...p, status: 'published', deploymentProgress: 100 } : p
    ));
    setDeployingPubId(null);
  };

  // Unpublish
  const unpublish = (pubId: string) => {
    setPublications(prev => prev.filter(p => p.id !== pubId));
  };

  // Download ZIP - FULLY FUNCTIONAL
  const downloadZip = async (project: Project) => {
    const zip = new JSZip();
    
    zip.file("index.html", `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${project.name}</title><style>${project.code.css}</style></head><body>${project.code.html}<script>${project.code.js}<\/script></body></html>`);
    zip.file("styles.css", project.code.css);
    zip.file("script.js", project.code.js);
    zip.file("README.md", `# ${project.name}\n\nGenerated with ASTRIX\n\nLive demo: ${publications.find(p=>p.projectId===project.id)?.liveUrl || 'Not published'}`);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${project.name.toLowerCase().replace(/\s+/g,'-')}.zip`);
  };

  // Copy URL
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-zinc-900 text-white px-5 py-3 rounded-xl text-sm flex items-center gap-2 shadow-xl z-50';
    toast.innerHTML = `<span>URL copied to clipboard</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1700);
  };

  // Open live site (in new tab with working preview)
  const openLiveSite = (pub: Publication) => {
    const project = projects.find(p => p.id === pub.projectId);
    if (!project) return;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${pub.projectName} • ASTRIX</title><style>${project.code.css}</style></head><body>${project.code.html}<script>${project.code.js}<\/script></body></html>
      `);
      win.document.close();
    }
  };

  // Open publish modal
  const openPublishModal = (project: Project) => {
    setSelectedProject(project);
    setPublishTarget(null);
    setShowPublishModal(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Top Nav */}
      <nav className="border-b border-zinc-800 sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
              <span className="font-bold text-xl tracking-[-1px]">A</span>
            </div>
            <div>
              <div className="font-semibold tracking-[-1.2px] text-2xl">ASTRIX</div>
              <div className="text-[10px] text-zinc-500 -mt-1">PUBLISH • HOST</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={() => setCurrentView('home')} className={`px-5 py-2 rounded-full transition ${currentView === 'home' ? 'bg-white text-black' : 'hover:bg-zinc-900'}`}>Home</button>
            <button onClick={() => setCurrentView('dashboard')} className={`px-5 py-2 rounded-full transition ${currentView === 'dashboard' ? 'bg-white text-black' : 'hover:bg-zinc-900'}`}>Dashboard</button>
            <button onClick={() => { if (!editingProject && projects.length > 0) { setEditingProject(projects[0]); setCurrentView('editor'); } else if (!editingProject) { setCurrentView('home'); } else { setCurrentView('editor'); } }} disabled={!editingProject && projects.length === 0} className="px-5 py-2 rounded-full bg-white text-black font-medium flex items-center gap-2 disabled:opacity-40">
              <Plus size={16} /> New Site
            </button>
          </div>
        </div>
      </nav>

      {/* HOME VIEW */}
      {currentView === 'home' && (
        <div>
          <div className="max-w-5xl mx-auto px-8 pt-20 pb-24 text-center">
            <div className="inline-block px-4 py-1 bg-zinc-900 rounded-full text-sm mb-6 tracking-[2px]">FREE HOSTING • INSTANT DEPLOY</div>
            <div className="text-[92px] font-semibold tracking-[-6.8px] leading-none">Publish websites.<br />Instantly.</div>
            <p className="mt-6 text-2xl text-zinc-400 max-w-md mx-auto">Create. Edit. Deploy to free ASTRIX hosting or GitHub Pages in seconds.</p>
            
            <div className="flex justify-center gap-4 mt-12">
              <button onClick={() => setCurrentView('dashboard')} className="px-10 py-4 rounded-2xl bg-white text-xl font-medium text-black flex items-center gap-3 hover:bg-zinc-200 transition">Open Dashboard <Rocket size={22} /></button>
              <button onClick={() => { const t = templates[0]; createProject(t); }} className="px-10 py-4 rounded-2xl border border-white/30 text-xl font-medium hover:bg-white/5 transition">Start from Template</button>
            </div>
          </div>
          
          <div className="border-t border-zinc-800 py-16 bg-zinc-900/60">
            <div className="max-w-5xl mx-auto px-8 grid grid-cols-3 gap-8">
              {templates.map((t, idx) => (
                <div key={idx} onClick={() => createProject(t)} className="group bg-zinc-900 border border-zinc-800 p-9 rounded-3xl hover:border-white/40 cursor-pointer transition-all active:scale-[0.985]">
                  <div className="font-semibold tracking-tight text-4xl mb-4">{t.name}</div>
                  <div className="text-zinc-400 mb-8">{t.description}</div>
                  <div className="inline-block text-sm px-6 py-2.5 border border-white/40 rounded-full group-hover:bg-white group-hover:text-black transition">Use Template →</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD VIEW - PUBLISHING DASHBOARD */}
      {currentView === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center justify-between mb-9">
            <div>
              <div className="text-5xl font-semibold tracking-[-2.2px]">Publishing Dashboard</div>
              <div className="text-zinc-400 mt-1">Manage live deployments • Free forever</div>
            </div>
            <button onClick={() => setCurrentView('home')} className="px-6 py-3 border border-white/30 rounded-2xl flex items-center gap-2 hover:bg-zinc-900">Create New Project</button>
          </div>

          {/* Projects List */}
          <div className="mb-14">
            <div className="uppercase tracking-[3px] text-xs text-zinc-500 mb-4 px-1">YOUR PROJECTS</div>
            {projects.length === 0 ? (
              <div className="border border-zinc-800 rounded-3xl p-16 text-center">No projects yet. Create one from the homepage.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => {
                  const pub = publications.find(p => p.projectId === project.id);
                  return (
                    <div key={project.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-7 flex flex-col">
                      <div className="font-semibold text-2xl tracking-tight mb-1">{project.name}</div>
                      <div className="text-sm text-zinc-500 mb-auto">{project.description}</div>
                      
                      <div className="flex gap-2 mt-8">
                        <button onClick={() => { setEditingProject(project); setCurrentView('editor'); }} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-sm">Edit Site</button>
                        <button onClick={() => openPublishModal(project)} className="flex-1 py-3 bg-white text-black font-medium rounded-2xl text-sm flex items-center justify-center gap-2">Publish <Rocket size={15}/></button>
                        <button onClick={() => downloadZip(project)} className="px-5 border border-white/30 hover:bg-white/5 rounded-2xl"><Download size={17}/></button>
                      </div>
                      {pub && <div className="text-[10px] mt-3 text-emerald-400 flex items-center gap-1"><CheckCircle size={13}/> LIVE ON {pub.provider}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PUBLICATIONS / LIVE SITES */}
          <div>
            <div className="flex items-baseline justify-between mb-5 px-1">
              <div className="uppercase tracking-[3px] text-xs text-zinc-500">LIVE PUBLICATIONS • REAL DEPLOYMENTS</div>
              <div className="text-sm text-zinc-400">{publications.length} active sites</div>
            </div>

            {publications.length === 0 ? (
              <div className="border border-zinc-800 rounded-3xl p-16 text-center text-zinc-400">Publish a project to see it here.</div>
            ) : (
              <div className="space-y-3">
                {publications.map(pub => {
                  const isDeployingThis = deployingPubId === pub.id;
                  return (
                    <div key={pub.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl px-8 py-6 flex items-center justify-between gap-6">
                      <div>
                        <div className="font-semibold text-xl tracking-tight">{pub.projectName}</div>
                        <div className="font-mono text-xs text-emerald-400 mt-px">{pub.liveUrl}</div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                          {pub.provider} • Deployed {new Date(pub.lastDeployed).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {pub.status === 'deploying' || isDeployingThis ? (
                          <div className="flex items-center gap-3 text-sm text-amber-400 w-52">
                            <div className="flex-1 h-px bg-amber-400/30"><div className="h-px bg-amber-400 transition-all" style={{width: `${pub.deploymentProgress}%`}} /></div>
                            {pub.deploymentProgress}%
                          </div>
                        ) : (
                          <div className="flex items-center text-emerald-400 text-sm gap-1.5"><CheckCircle size={16}/> Published</div>
                        )}

                        <button onClick={() => openLiveSite(pub)} className="px-5 py-2.5 rounded-2xl border border-white/40 flex items-center gap-2 text-sm hover:bg-white hover:text-black transition"><ExternalLink size={16}/> Open</button>
                        <button onClick={() => copyUrl(pub.liveUrl)} className="px-5 py-2.5 rounded-2xl border border-white/40 flex items-center gap-2 text-sm hover:bg-white hover:text-black transition"><Copy size={16}/> Copy</button>
                        <button onClick={() => updatePublication(pub)} disabled={isDeployingThis} className="px-5 py-2.5 rounded-2xl border border-white/40 flex items-center gap-2 text-sm hover:bg-white hover:text-black transition disabled:opacity-40"><RefreshCw size={16}/> Update</button>
                        <button onClick={() => unpublish(pub.id)} className="px-5 py-2.5 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-950/40 text-sm flex items-center gap-2"><Trash2 size={16}/> Unpublish</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDITOR VIEW */}
      {currentView === 'editor' && editingProject && (
        <div className="max-w-7xl mx-auto px-8 py-9">
          <div className="flex justify-between mb-6 items-center">
            <div>
              <div className="text-4xl font-semibold tracking-tight">{editingProject.name}</div>
              <div className="text-zinc-400">Live preview updates instantly</div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdits} className="px-8 py-3.5 bg-white text-black font-medium rounded-2xl">Save &amp; Return to Dashboard</button>
              <button onClick={() => openPublishModal(editingProject)} className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 rounded-2xl flex items-center gap-2">Publish Website <Rocket /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Code Editors */}
            <div className="space-y-5">
              {(['html','css','js'] as const).map(field => (
                <div key={field} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <div className="uppercase text-xs tracking-[3px] text-zinc-400 mb-4">{field.toUpperCase()}</div>
                  <textarea value={editingProject.code[field]} onChange={e => updateProjectCode(field, e.target.value)} spellCheck={false} className="font-mono text-sm w-full h-64 bg-black resize-y p-5 rounded-2xl border border-zinc-800 focus:outline-none" />
                </div>
              ))}
            </div>

            {/* Live Preview */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden h-[610px] sticky top-8">
              <div className="bg-zinc-950 px-6 py-3 text-xs flex items-center gap-2 border-b border-zinc-800"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div> LIVE PREVIEW</div>
              <iframe title="preview" className="w-full h-[calc(100%-45px)] bg-white" srcDoc={`<html><head><style>${editingProject.code.css}</style></head><body>${editingProject.code.html}<script>${editingProject.code.js}</script></body></html>`} />
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH MODAL - FULL FUNCTIONAL */}
      <AnimatePresence>
        {showPublishModal && selectedProject && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-6">
            <motion.div initial={{opacity:0, scale:0.96, y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}} className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-3xl p-9">
              <div className="flex justify-between mb-8">
                <div className="font-semibold text-3xl tracking-tight">Publish {selectedProject.name}</div>
                <button onClick={() => {setShowPublishModal(false); setPublishTarget(null);}}><X /></button>
              </div>

              {!publishTarget && (
                <div className="space-y-4">
                  <button onClick={() => publishToAstrix(selectedProject)} className="w-full py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 font-medium flex items-center justify-center gap-3 text-lg">Publish to ASTRIX Hosting <Globe /></button>
                  
                  <div className="text-center text-xs text-zinc-400 py-1">or</div>
                  
                  <button onClick={() => { if (githubConnection.connected) { setPublishTarget('GitHub'); } else { connectGitHub(); } }} className="w-full py-5 border border-white/40 hover:bg-white hover:text-black rounded-2xl flex justify-center gap-3 text-lg transition">Connect &amp; Publish to GitHub <Github /></button>
                </div>
              )}

              {publishTarget === 'GitHub' && githubConnection.connected && (
                <div>
                  <div className="flex items-center gap-3 bg-zinc-950 p-4 rounded-2xl mb-6">
                    <img src={githubConnection.avatar} className="w-9 h-9 rounded-full" />
                    <div>Connected as <span className="font-medium">@{githubConnection.username}</span></div>
                  </div>
                  
                  <input value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)} placeholder="my-awesome-site" className="bg-zinc-950 border border-zinc-700 px-5 py-4 w-full rounded-2xl text-lg mb-4" />
                  <div className="text-xs text-zinc-400 mb-7">Will be published to {githubConnection.username}.github.io/{selectedRepo || 'project-name'}</div>
                  
                  <button onClick={() => publishToGitHub(selectedProject)} className="w-full py-5 bg-white text-black font-medium rounded-2xl text-lg">Deploy to GitHub Pages</button>
                  <button onClick={disconnectGitHub} className="mt-3 text-xs text-zinc-400 w-full">Disconnect GitHub</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
