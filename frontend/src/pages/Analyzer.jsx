import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Bug, Boxes, FileCode2 } from 'lucide-react';

import ResourcesTab from '../components/analyzer/ResourcesTab.jsx';
import PodIssuesTab from '../components/analyzer/PodIssuesTab.jsx';
import HelmTab from '../components/analyzer/HelmTab.jsx';
import YamlEditorTab from '../components/analyzer/YamlEditorTab.jsx';

const DEFAULT_ROLE = 'admin'; // change to 'admin' for admin flows

const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition
      ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
               : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
  >
    <Icon className="w-4 h-4" />
    {children}
  </button>
);

export default function Analyzer() {
  const [tab, setTab] = useState('resources'); // resources | pod-issues | helm | yaml

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-3">
        <TabButton active={tab === 'resources'} onClick={() => setTab('resources')} icon={Wrench}>Resources</TabButton>
        <TabButton active={tab === 'pod-issues'} onClick={() => setTab('pod-issues')} icon={Bug}>Pod Issue List</TabButton>
        <TabButton active={tab === 'helm'} onClick={() => setTab('helm')} icon={Boxes}>Helm</TabButton>
        <TabButton active={tab === 'yaml'} onClick={() => setTab('yaml')} icon={FileCode2}>YAML Editor</TabButton>
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-4"
      >
        {tab === 'resources' && <ResourcesTab role={DEFAULT_ROLE} />}
        {tab === 'pod-issues' && <PodIssuesTab role={DEFAULT_ROLE} />}
        {tab === 'helm' && <HelmTab role={DEFAULT_ROLE} />}
        {tab === 'yaml' && <YamlEditorTab role={DEFAULT_ROLE} />}
      </motion.div>
    </div>
  );
}
