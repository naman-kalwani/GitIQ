import Analyze from "./components/Analyze";

function App() {
  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
      <section className="flex flex-col items-center space-y-4">
        <div>
          <h1 className="text-2xl">GitIQ - Github Analyzer</h1>
          <p>
            paste your github profile link and get insights about your
            repositories.
          </p>
        </div>
        <Analyze />
      </section>
    </div>
  );
}

export default App;
