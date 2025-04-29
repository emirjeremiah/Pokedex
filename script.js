$(document).ready(function() {
    const pokemonGrid = $('#pokemonGrid');
    const loadingSpinner = $('#loadingSpinner');
    const loadMoreBtn = $('#loadMoreBtn');
    const loadMoreContainer = $('#loadMoreContainer');
    const searchInput = $('#searchInput');
    const searchButton = $('#searchButton');
    const clearButton = $('#clearButton');
    const filterAll = $('#filterAll');
    const filterNewest = $('#filterNewest');
    const filterFavorites = $('#filterFavorites');
    const addToFavoritesBtn = $('#addToFavoritesBtn');
    const generationInfo = $('#generationInfo');
    
    let currentOffset = 0;
    const limit = 20;
    let currentGeneration = 'all';
    let currentFilter = 'all';
    let favorites = JSON.parse(localStorage.getItem('pokemonFavorites')) || [];
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
    
    // Clear search
    clearButton.click(function() {
        searchInput.val('');
        searchInput.focus();
    });
    
    // Filter buttons
    filterAll.click(function() {
        setFilter('all');
    });
    
    filterNewest.click(function() {
        setFilter('newest');
    });
    
    filterFavorites.click(function() {
        setFilter('favorites');
    });
    
    function setFilter(filter) {
        currentFilter = filter;
        currentOffset = 0;
        pokemonGrid.empty();
        
        // Update active button
        $('.filter-buttons .btn').removeClass('active');
        $(`#filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).addClass('active');
        
        loadPokemon();
    }
    
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
                    
                    // For newest filter
                    if (currentFilter === 'newest' && pokemonData.id < 900) {
                        return null;
                    }
                    
                    return pokemonData;
                });
            });
            
            Promise.all(pokemonPromises).then(pokemonDetails => {
                // Filter out null values (from generation/type filtering)
                let validPokemon = pokemonDetails.filter(p => p !== null);
                
                // For favorites filter
                if (currentFilter === 'favorites') {
                    validPokemon = validPokemon.filter(pokemon => favorites.includes(pokemon.id));
                }
                
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
            
            // Check if favorite
            const isFavorite = favorites.includes(pokemonId);
            
            const pokemonCard = `
                <div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6">
                    <div class="pokemon-card animate__animated animate__fadeIn" data-id="${pokemonId}" data-generation="${generation}" data-favorite="${isFavorite}">
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
        
        // Apply current filter
        applyCurrentFilter();
    }
    
    function applyCurrentFilter() {
        $('.pokemon-card').show();
        
        if (currentFilter === 'newest') {
            $('.pokemon-card').not('[data-generation="9"]').hide();
        } else if (currentFilter === 'favorites') {
            $('.pokemon-card').not('[data-favorite="true"]').hide();
        }
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
            const isFavorite = favorites.includes(pokemonId);
            
            // Update favorite button
            updateFavoriteButton(pokemonId, isFavorite);
            
            // Get species data for description and evolution chain
            $.get(pokemon.species.url, function(species) {
                // Get all English flavor texts
                const englishEntries = species.flavor_text_entries.filter(entry => entry.language.name === 'en');
                
                // Select the most recent game version description
                const latestEntry = englishEntries.reduce((latest, entry) => {
                    return (!latest || entry.version.name > latest.version.name) ? entry : latest;
                }, null);
                
                // Fallback to any English description if no latest found
                const description = latestEntry?.flavor_text.replace(/\f/g, ' ') || 
                                  englishEntries[0]?.flavor_text.replace(/\f/g, ' ') || 
                                  'No description available';
                
                // Get habitat if available
                const habitat = species.habitat?.name || 'Unknown';
                
                // Get genus (short classification)
                const genusEntry = species.genera.find(genus => genus.language.name === 'en');
                const genus = genusEntry?.genus || 'Unknown species';
                
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
                
                // Get moves/learnset
                const movesPromise = $.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`).then(pokemonData => {
                    return pokemonData.moves.map(move => {
                        return {
                            name: move.move.name,
                            details: move.version_group_details.map(detail => {
                                return {
                                    level: detail.level_learned_at,
                                    method: detail.move_learn_method.name,
                                    version: detail.version_group.name
                                };
                            })
                        };
                    });
                });
                
                Promise.all([evolutionChainPromise, movesPromise]).then(([evolutionChain, moves]) => {
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
                    if (evolutionChain && evolutionChain.length > 1) {
                        evolutionDisplay = `
                            <div class="mt-4">
                                <h6><i class="fas fa-link me-2"></i>Evolution Chain</h6>
                                <div class="evolution-chain">
                                    ${evolutionChain.map(stage => `
                                        <div class="evolution-stage">
                                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${stage.id}.png" 
                                                 alt="${stage.name}" 
                                                 width="80" 
                                                 height="80"
                                                 class="${stage.id === pokemonId ? 'border border-3 border-primary rounded-circle' : ''}">
                                            <div class="text-capitalize">${stage.name}</div>
                                            <div>#${stage.id.toString().padStart(4, '0')}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                    
                    // Group moves by learn method
                    const levelUpMoves = moves.filter(move => 
                        move.details.some(detail => detail.method === 'level-up')
                    ).map(move => {
                        const detail = move.details.find(d => d.method === 'level-up');
                        return {
                            name: move.name,
                            level: detail.level
                        };
                    }).sort((a, b) => a.level - b.level);
                    
                    const machineMoves = moves.filter(move => 
                        move.details.some(detail => detail.method === 'machine')
                    ).map(move => ({
                        name: move.name
                    }));
                    
                    const eggMoves = moves.filter(move => 
                        move.details.some(detail => detail.method === 'egg')
                    ).map(move => ({
                        name: move.name
                    }));
                    
                    // Create moves display
                    const movesDisplay = `
                        <div class="mt-4">
                            <ul class="nav nav-tabs" id="movesTab" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="levelup-tab" data-bs-toggle="tab" data-bs-target="#levelup" type="button" role="tab">
                                        <i class="fas fa-level-up-alt me-1"></i>Level Up
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="machine-tab" data-bs-toggle="tab" data-bs-target="#machine" type="button" role="tab">
                                        <i class="fas fa-compact-disc me-1"></i>TMs/HMs
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="egg-tab" data-bs-toggle="tab" data-bs-target="#egg" type="button" role="tab">
                                        <i class="fas fa-egg me-1"></i>Egg Moves
                                    </button>
                                </li>
                            </ul>
                            <div class="tab-content" id="movesTabContent">
                                <div class="tab-pane fade show active" id="levelup" role="tabpanel">
                                    ${levelUpMoves.length > 0 ? 
                                        levelUpMoves.map(move => `
                                            <div class="learnset-move">
                                                <span class="text-capitalize">${move.name.replace('-', ' ')}</span>
                                                <span class="badge bg-primary">Lv. ${move.level}</span>
                                            </div>
                                        `).join('') : 
                                        '<p class="text-muted mt-2">No level-up moves</p>'
                                    }
                                </div>
                                <div class="tab-pane fade" id="machine" role="tabpanel">
                                    ${machineMoves.length > 0 ? 
                                        machineMoves.map(move => `
                                            <div class="learnset-move">
                                                <span class="text-capitalize">${move.name.replace('-', ' ')}</span>
                                            </div>
                                        `).join('') : 
                                        '<p class="text-muted mt-2">No TM/HM moves</p>'
                                    }
                                </div>
                                <div class="tab-pane fade" id="egg" role="tabpanel">
                                    ${eggMoves.length > 0 ? 
                                        eggMoves.map(move => `
                                            <div class="learnset-move">
                                                <span class="text-capitalize">${move.name.replace('-', ' ')}</span>
                                            </div>
                                        `).join('') : 
                                        '<p class="text-muted mt-2">No egg moves</p>'
                                    }
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Set modal content
                    $('#pokemonModalTitle').text(`#${pokemonId.toString().padStart(4, '0')} ${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)} (Gen ${generation})`);
                    
                    $('#pokemonModalBody').html(`
                        <div class="row">
                            <div class="col-md-4">
                                <div class="pokemon-details-header">
                                    <img src="${pokemonImage}" alt="${pokemonName}" class="modal-pokemon-img animate__animated animate__bounceIn">
                                    <div class="pokemon-types-modal mt-3">${typeBadges}</div>
                                    <p class="mt-2 text-muted"><small>${genus}</small></p>
                                </div>
                                
                                <div class="mt-4">
                                    <h6><i class="fas fa-info-circle me-2"></i>Details</h6>
                                    <p><strong><i class="fas fa-ruler-vertical me-2"></i>Height:</strong> ${pokemonHeight} m</p>
                                    <p><strong><i class="fas fa-weight me-2"></i>Weight:</strong> ${pokemonWeight} kg</p>
                                    <p><strong><i class="fas fa-map-marked-alt me-2"></i>Habitat:</strong> ${habitat.charAt(0).toUpperCase() + habitat.slice(1)}</p>
                                    <p><strong><i class="fas fa-layer-group me-2"></i>Generation:</strong> ${generation}</p>
                                    <p><strong><i class="fas fa-bolt me-2"></i>Abilities:</strong></p>
                                    <ul class="mb-3">
                                        ${pokemonAbilities.map(ability => `
                                            <li class="text-capitalize">
                                                <i class="fas fa-chevron-right me-2"></i>${ability.replace('-', ' ')}
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                            <div class="col-md-8">
                                <div class="pokemon-stats">
                                    <h6><i class="fas fa-book-open me-2"></i>Description</h6>
                                    <p class="mb-4">${description}</p>
                                    
                                    <h6 class="mb-3"><i class="fas fa-chart-bar me-2"></i>Stats</h6>
                                    ${statsBars}
                                    
                                    ${movesDisplay}
                                    
                                    ${evolutionDisplay}
                                </div>
                            </div>
                        </div>
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
    
    // Favorite functionality
    function updateFavoriteButton(pokemonId, isFavorite) {
        if (isFavorite) {
            addToFavoritesBtn.html('<i class="fas fa-star"></i> Favorited');
            addToFavoritesBtn.removeClass('btn-outline-primary').addClass('btn-primary');
        } else {
            addToFavoritesBtn.html('<i class="far fa-star"></i> Favorite');
            addToFavoritesBtn.removeClass('btn-primary').addClass('btn-outline-primary');
        }
    }
    
    addToFavoritesBtn.click(function() {
        const pokemonId = parseInt($('#pokemonModalTitle').text().split('#')[1].split(' ')[0]);
        const index = favorites.indexOf(pokemonId);
        
        if (index === -1) {
            // Add to favorites
            favorites.push(pokemonId);
            $(`.pokemon-card[data-id="${pokemonId}"]`).attr('data-favorite', 'true');
            updateFavoriteButton(pokemonId, true);
        } else {
            // Remove from favorites
            favorites.splice(index, 1);
            $(`.pokemon-card[data-id="${pokemonId}"]`).attr('data-favorite', 'false');
            updateFavoriteButton(pokemonId, false);
            
            // If we're in favorites filter, hide this card
            if (currentFilter === 'favorites') {
                $(`.pokemon-card[data-id="${pokemonId}"]`).parent().hide();
            }
        }
        
        // Save to localStorage
        localStorage.setItem('pokemonFavorites', JSON.stringify(favorites));
    });
});