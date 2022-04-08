import React from 'react';
import axios from 'axios';

const API_ENDPOINT = 'https://hn.algolia.com/api/v1/search?query=';

// Reducer functions receive state, and an action. 
// They return a new state
const storiesReducer = (state, action) => {
  switch (action.type) {
    case 'STORIES_FETCH_INIT':
      return {
        ...state, // Using the spread operator for key / value pairs
        isLoading: true,
        isError: false
      };
    case 'STORIES_FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload
      };
    case 'STORIES_FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true
      };
    case 'REMOVE_STORY':
      return {
        ...state,
        data: state.data.filter(
          (story) => action.payload.objectID !== story.objectID
        )
      };
    default:
      throw new Error();
  }
};

// Custom hook
// Returns the value, and a function to update it
// Internally it stores the value in local storage
const useSemiPersistentState = (key, initialState) => {

  // store the value in state
  const [value, setValue] = React.useState(
    // the initial value is either loaded form storage, or supplied
    localStorage.getItem(key) || initialState
  );

  // update the local storage if either the key or value changes.
  React.useEffect(() => {
    localStorage.setItem(key, value);
  }, [value, key]);

  return [value, setValue];
};

const App = () => {  

  // utilising the custom hook
  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', 'React');

  // storing the url in state - default value supplied above
  const [url, setUrl] = React.useState(
    `${API_ENDPOINT}${searchTerm}`
  );

  // when input is detected, update the search term
  const handleSearchInput = (event) => {
    setSearchTerm(event.target.value);
  };

  // when submit is pressed, update the url with the current search term
  const handleSearchSubmit = (event) => {
    setUrl(`${API_ENDPOINT}${searchTerm}`);

    event.preventDefault();
  }

  // use a reducer, providing the function, and initial state as args.
  // stories is the current state, dispatch stories is the state updater function
  const [stories, dispatchStories] = React.useReducer(storiesReducer, { data: [], isLoading: false, isError: false });

  // useCallback creates a memoized function every time the dependency array changes.
  // in this case, when the url changes, our anonymous function below will update 
  // in order to fetch from the new url.
  const handleFetchStories = React.useCallback(async () => {

    // use the state updater function from our reducer to update the state, providing a
    // type, and optional payload (omitted)
    dispatchStories({type: 'STORIES_FETCH_INIT'});

    // fetch the data from the url
    try {
      const result = await axios.get(url);

      // update the state again, this time supplying a payload
      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: result.data.hits,
      });
    } catch {
      dispatchStories({type: 'STORIES_FETCH_FAILURE'}) // update the state if we encounter issues
    }
  }, [url]);

  // execute the function when the function changes
  // each time the url changes, the function changes
  // if it's not memoized, then there would be a new function defined
  // each time the app is rendered, and that function would then be executed by 
  // the side-effect below. Part of the function execution updates the state,
  // which will cause a re-render. This would therefore create an infinite loop.
  React.useEffect(() => {
    handleFetchStories();
  }, [handleFetchStories]);

  // simple handler to update the state using the state updater function
  const handleRemoveStory = (item) => {
    dispatchStories({
      type: 'REMOVE_STORY',
      payload: item
    });
  }

  return (
    <div>
      <h1>My Hacker Stories</h1>

      <SearchForm
        searchTerm={searchTerm}
        onSearchInput={handleSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <hr/>
      {stories.isError && <p>Something went wrong ...</p>}
      {stories.isLoading ? (
        <p>Loading ...</p>
      ) : (
      <List list={stories.data} onRemoveItem={handleRemoveStory} />
      )}
    </div>
  )
}

const SearchForm = ({
  searchTerm,
  onSearchInput,
  onSearchSubmit,
}) => (
  <form onSubmit={onSearchSubmit}>
    <InputWithLabel 
      id="search"
      value={searchTerm}
      isFocused
      onInputChange={onSearchInput} 
    >
      <strong>Search:</strong>
    </InputWithLabel>
    <button type="submit" disabled={!searchTerm}>
      Submit
    </button>
  </form>   
);

const InputWithLabel = ({
  id, 
  value, 
  type = 'text', 
  onInputChange, 
  isFocused,
  children
}) => {

  const inputRef = React.useRef();

  React.useEffect(() => {
    if(isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  return (
    <div>
      <label htmlFor={id}>{children}</label>
      &nbsp;
      <input 
        ref={inputRef}
        id={id} 
        type={type} 
        value={value} 
        onChange={onInputChange}/>
    </div>
  )
}

const List = ({list, onRemoveItem}) => (
  <ul>
    {list.map((item) => (
      <Item 
        key={item.objectID} 
        item={item} 
        onRemoveItem={onRemoveItem} 
      />
    ))}
  </ul>
)

const Item = ({item, onRemoveItem}) => {
  const handleRemoveItem = () => {
    onRemoveItem(item);
  };

  return (
    <li>
      <span>
        <a href={item.url}>{item.title}</a>
        <span>{item.author}</span>
        <span>{item.num_comments}</span>
        <span>{item.points}</span>
        <span>
          <button type="button" onClick={handleRemoveItem}>
            Dismiss
          </button>
        </span>
      </span>
    </li>
  )
}

export default App;