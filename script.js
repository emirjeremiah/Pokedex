$(document).ready(function() {
    const pokemonGrid = $('#pokemonGrid');
    const loadingSpinner = $('#loadingSpinner');
    const loadMoreBtn = $('#loadMoreBtn');
    const loadMoreContainer = $('#loadMoreContainer');
    const searchInput = $('#searchInput');
    const searchButton = $('#searchButton');
    const resetButton = $('#resetButton');
    const generationFilterBtn = $('#generationFilterBtn');
    const generationFilterContainer = $('#generationFilterContainer');
    const generationInfo = $('#generationInfo');
    
    let currentOffset = 0;
    const limit = 20;
    let currentGeneration = 'all';
    let currentPokemonCount = 0;
    const generationLimits = {
        '1': { start: 1, end: 151 },
        '2': { start: 152, end: 251 },
        '3': { start: 252, end: 386 },
        '4': { start: 387, end: 493 },
        '5': { start: 494, end: 649 },
        '6': { start: 650, end: 721 },
        '7': { start: 722, end: 809 },
        '8': { start: 810, end: 905 },
        '9': { start: 906, end: 1025 }
    };
    
    // Initialize
    loadPokemon();
    
    // Load more Pokémon
    loadMoreBtn.click(function() {
        currentOffset += limit;
        loadPokemon();
    });
    
    // Search functionality
    searchButton.click(searchPokemon);
    searchInput.keypress(function(e) {
        if (e.which === 13) {
            searchPokemon();
        }
    });
    
    // Reset search
    resetButton.click(function() {
        searchInput.val('');
        currentOffset = 0;
        pokemonGrid.empty();
        loadPokemon();
        loadMoreContainer.show();
    });
    
    // Toggle generation filter
    generationFilterBtn.click(function() {
        generationFilterContainer.toggleClass('d-none');
    });
    
    // Filter by generation
    $('.generation-filter').click(function() {
        const gen = $(this).data('gen');
        currentGeneration = gen;
        currentOffset = 0;
        pokemonGrid.empty();
        
        if (gen === 'all') {
            generationInfo.text('All Pokémon from Generations 1-9');
        } else {
            generationInfo.text(`Generation ${gen} Pokémon (${generationLimits[gen].start}-${generationLimits[gen].end})`);
        }
        
        loadPokemon();
        generationFilterContainer.addClass('d-none');
    });
    
    // Load Pokémon from API
    function loadPokemon() {
        loadingSpinner.show();
        pokemonGrid.hide();
        
        let apiUrl = `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${currentOffset}`;
        
        // If filtering by generation, adjust the offset and limit
        if (currentGeneration !== 'all') {
            const genLimits = generationLimits[currentGeneration];
            const remaining = genLimits.end - (currentOffset + genLimits.start - 1);
            
            if (remaining <= 0) {
                loadMoreContainer.hide();
                loadingSpinner.hide();
                return;
            }
            
            const actualLimit = Math.min(limit, remaining);
            apiUrl = `https://pokeapi.co/api/v2/pokemon?limit=${actualLimit}&offset=${currentOffset + genLimits.start - 1}`;
        }
        
        $.get(apiUrl, function(data) {
            const pokemonList = data.results;
            
            // Fetch details for each Pokémon
            const pokemonPromises = pokemonList.map(pokemon => {
                return $.get(pokemon.url).then(pokemonData => {
                    // Check if we're still within the generation limits
                    if (currentGeneration !== 'all') {
                        const genLimits = generationLimits[currentGeneration];
                        if (pokemonData.id < genLimits.start || pokemonData.id > genLimits.end) {
                            return null;
                        }
                    }
                    return pokemonData;
                });
            });
            
            Promise.all(pokemonPromises).then(pokemonDetails => {
                // Filter out null values (from generation filtering)
                const validPokemon = pokemonDetails.filter(p => p !== null);
                
                if (validPokemon.length > 0) {
                    displayPokemon(validPokemon);
                    loadingSpinner.hide();
                    pokemonGrid.fadeIn();
                    
                    // Update currentPokemonCount for generation filtering
                    if (currentGeneration !== 'all') {
                        currentPokemonCount += validPokemon.length;
                        const genLimits = generationLimits[currentGeneration];
                        
                        if (currentPokemonCount >= (genLimits.end - genLimits.start + 1)) {
                            loadMoreContainer.hide();
                        } else {
                            loadMoreContainer.show();
                        }
                    } else {
                        // For "all generations", just show the button unless we've hit the API limit
                        if (data.next === null) {
                            loadMoreContainer.hide();
                        } else {
                            loadMoreContainer.show();
                        }
                    }
                } else {
                    // No valid Pokémon in this batch, try loading more
                    currentOffset += limit;
                    loadPokemon();
                }
            });
        }).fail(function() {
            loadingSpinner.html('<div class="alert alert-danger">Failed to load Pokémon. Please try again later.</div>');
        });
    }
    
    // Display Pokémon in grid
    function displayPokemon(pokemonList) {
        pokemonList.forEach(pokemon => {
            const pokemonId = pokemon.id;
            const pokemonName = pokemon.name;
            const pokemonTypes = pokemon.types.map(type => type.type.name);
            const pokemonImage = pokemon.sprites.other['official-artwork'].front_default || 
                               pokemon.sprites.front_default;
            
            // Determine generation
            let generation = 1;
            for (const gen in generationLimits) {
                if (pokemonId >= generationLimits[gen].start && pokemonId <= generationLimits[gen].end) {
                    generation = gen;
                    break;
                }
            }
            
            const typeBadges = pokemonTypes.map(type => `
                <span class="pokemon-type type-${type}">${type}</span>
            `).join('');
            
            const pokemonCard = `
                <div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6">
                    <div class="pokemon-card animate__animated animate__fadeIn gen-${generation}" data-id="${pokemonId}">
                        <div class="pokemon-img-container">
                            <img src="${pokemonImage}" alt="${pokemonName}" class="pokemon-img">
                        </div>
                        <div class="pokemon-info">
                            <div class="pokemon-number">#${pokemonId.toString().padStart(4, '0')}</div>
                            <h5 class="pokemon-name">${pokemonName}</h5>
                            <div class="pokemon-types">${typeBadges}</div>
                        </div>
                    </div>
                </div>
            `;
            
            pokemonGrid.append(pokemonCard);
        });
        
        // Add click event to each card
        $('.pokemon-card').click(function() {
            const pokemonId = $(this).data('id');
            showPokemonDetails(pokemonId);
        });
    }
    
    // Search Pokémon by name or ID
    function searchPokemon() {
        const searchTerm = searchInput.val().trim().toLowerCase();
        
        if (!searchTerm) return;
        
        loadingSpinner.show();
        pokemonGrid.empty().hide();
        loadMoreContainer.hide();
        
        // Check if search term is a number (ID)
        if (!isNaN(searchTerm)) {
            const pokemonId = parseInt(searchTerm);
            
            if (pokemonId < 1 || pokemonId > 1025) {
                loadingSpinner.html('<div class="alert alert-warning">Please enter a number between 1 and 1025</div>');
                return;
            }
            
            $.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`, function(pokemon) {
                displayPokemon([pokemon]);
                loadingSpinner.hide();
                pokemonGrid.fadeIn();
            }).fail(function() {
                loadingSpinner.html('<div class="alert alert-danger">Pokémon not found</div>');
            });
        } else {
            // Search by name - we need to handle this differently since the API doesn't support direct name search with limits
            // We'll fetch all Pokémon and filter client-side (not ideal, but PokéAPI doesn't support name search with offset)
            loadingSpinner.html('<div class="spinner-border text-danger" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-3">Searching through all Pokémon...</p>');
            
            // First get the total count
            $.get('https://pokeapi.co/api/v2/pokemon?limit=1', function(data) {
                const totalCount = data.count;
                const allPokemon = [];
                
                // Fetch all Pokémon in batches
                const fetchBatch = (offset) => {
                    return $.get(`https://pokeapi.co/api/v2/pokemon?limit=200&offset=${offset}`).then(batchData => {
                        const matching = batchData.results.filter(p => p.name.includes(searchTerm));
                        allPokemon.push(...matching);
                        
                        if (offset + 200 < totalCount && allPokemon.length < 20) {
                            return fetchBatch(offset + 200);
                        }
                        return allPokemon;
                    });
                };
                
                fetchBatch(0).then(results => {
                    if (results.length === 0) {
                        loadingSpinner.html('<div class="alert alert-warning">No Pokémon found with that name</div>');
                        return;
                    }
                    
                    // Fetch details for the matches
                    const pokemonPromises = results.slice(0, 20).map(pokemon => {
                        return $.get(pokemon.url).then(pokemonData => {
                            return pokemonData;
                        });
                    });
                    
                    Promise.all(pokemonPromises).then(pokemonDetails => {
                        displayPokemon(pokemonDetails);
                        loadingSpinner.hide();
                        pokemonGrid.fadeIn();
                    });
                });
            }).fail(function() {
                loadingSpinner.html('<div class="alert alert-danger">Failed to search Pokémon. Please try again later.</div>');
            });
        }
    }
    
    // Show detailed Pokémon information in modal
    function showPokemonDetails(pokemonId) {
        loadingSpinner.show();
        
        $.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`, function(pokemon) {
            const pokemonName = pokemon.name;
            const pokemonImage = pokemon.sprites.other['official-artwork'].front_default || 
                               pokemon.sprites.front_default;
            const pokemonTypes = pokemon.types.map(type => type.type.name);
            const pokemonHeight = pokemon.height / 10; // Convert to meters
            const pokemonWeight = pokemon.weight / 10; // Convert to kg
            const pokemonAbilities = pokemon.abilities.map(ability => ability.ability.name);
            const pokemonStats = pokemon.stats;
            
            // Get species data for description and evolution chain
            $.get(pokemon.species.url, function(species) {
                const description = species.flavor_text_entries.find(
                    entry => entry.language.name === 'en'
                )?.flavor_text.replace(/\f/g, ' ') || 'No description available';
                
                // Determine generation
                let generation = 1;
                for (const gen in generationLimits) {
                    if (pokemonId >= generationLimits[gen].start && pokemonId <= generationLimits[gen].end) {
                        generation = gen;
                        break;
                    }
                }
                
                // Get evolution chain if available
                let evolutionChainPromise = Promise.resolve(null);
                if (species.evolution_chain) {
                    evolutionChainPromise = $.get(species.evolution_chain.url).then(chainData => {
                        return parseEvolutionChain(chainData.chain);
                    });
                }
                
                evolutionChainPromise.then(evolutionChain => {
                    // Create type badges
                    const typeBadges = pokemonTypes.map(type => `
                        <span class="type-badge type-${type}">${type}</span>
                    `).join('');
                    
                    // Create stats bars
                    const statsBars = pokemonStats.map(stat => `
                        <div class="mb-2">
                            <div class="d-flex justify-content-between">
                                <span class="text-capitalize">${stat.stat.name.replace('-', ' ')}</span>
                                <span>${stat.base_stat}</span>
                            </div>
                            <div class="stats-bar">
                                <div class="stats-progress" style="width: ${(stat.base_stat / 255) * 100}%"></div>
                            </div>
                        </div>
                    `).join('');
                    
                    // Create evolution display if available
                    let evolutionDisplay = '';
                    if (evolutionChain) {
                        evolutionDisplay = `
                            <div class="mt-4">
                                <h6>Evolution Chain</h6>
                                <div class="evolution-chain">
                                    ${evolutionChain.map(stage => `
                                        <div class="evolution-stage">
                                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${stage.id}.png" 
                                                 alt="${stage.name}" 
                                                 width="80" 
                                                 height="80"
                                                 class="${stage.id === pokemonId ? 'border border-3 border-danger rounded-circle' : ''}">
                                            <div class="text-capitalize">${stage.name}</div>
                                            <div>#${stage.id.toString().padStart(4, '0')}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                    
                    // Set modal content
                    $('#pokemonModalTitle').text(`#${pokemonId.toString().padStart(4, '0')} ${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)} (Gen ${generation})`);
                    
                    $('#pokemonModalBody').html(`
                        <div class="text-center mb-4">
                            <img src="${pokemonImage}" alt="${pokemonName}" class="modal-pokemon-img animate__animated animate__bounceIn">
                            <div class="mt-2">${typeBadges}</div>
                        </div>
                        
                        <p class="mb-4">${description}</p>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6>Details</h6>
                                <p><strong>Height:</strong> ${pokemonHeight} m</p>
                                <p><strong>Weight:</strong> ${pokemonWeight} kg</p>
                                <p><strong>Generation:</strong> ${generation}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Abilities</h6>
                                <ul>
                                    ${pokemonAbilities.map(ability => `<li class="text-capitalize">${ability.replace('-', ' ')}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        
                        <h6 class="mb-3">Stats</h6>
                        ${statsBars}
                        
                        ${evolutionDisplay}
                    `);
                    
                    loadingSpinner.hide();
                    const modal = new bootstrap.Modal(document.getElementById('pokemonModal'));
                    modal.show();
                });
            });
        }).fail(function() {
            loadingSpinner.html('<div class="alert alert-danger">Failed to load Pokémon details</div>');
        });
    }
    
    // Helper function to parse evolution chain
    function parseEvolutionChain(chain) {
        const result = [];
        
        // Add first stage
        const firstId = chain.species.url.split('/').slice(-2, -1)[0];
        result.push({
            id: parseInt(firstId),
            name: chain.species.name
        });
        
        // Recursively add evolution stages
        let current = chain;
        while (current.evolves_to.length > 0) {
            const next = current.evolves_to[0]; // We'll just take the first evolution path
            const nextId = next.species.url.split('/').slice(-2, -1)[0];
            result.push({
                id: parseInt(nextId),
                name: next.species.name
            });
            current = next;
        }
        
        return result;
    }
});