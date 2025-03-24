import { useFetch } from '../hooks/useFetch.tsx';

type Pokemon = {
  name: string;
};

const PokemonList = () => {
  const { data, isLoading, error } = useFetch<{ results: Pokemon[] }>(
    `https://pokeapi.co/api/v2/pokemon?${new URLSearchParams({
      limit: '10',
      offset: '0',
    })}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from('lol'),
    }
  );
  const pokemons = data?.results || [];

  if (isLoading) {
    return <p>Loading ...</p>;
  }

  if (error) {
    return <pre>{error.stack}</pre>;
  }

  return (
    <ol>
      {pokemons.map((pokemon) => (
        <li key={pokemon.name}>{pokemon.name}</li>
      ))}
    </ol>
  );
};

export default PokemonList;
