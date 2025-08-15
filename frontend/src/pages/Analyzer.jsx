import ProblemList from '../components/ProblemList.jsx';

export default function Analyzer() {
  // In real app, `userRole` should come from auth context / Redux store
  const userRole = 'editor'; // mock role for now

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-indigo-700">Analyzer</h1>
      <ProblemList userRole={userRole} />
    </div>
  );
}

