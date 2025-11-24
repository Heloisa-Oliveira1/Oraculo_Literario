document.addEventListener('DOMContentLoaded', () => {
    const livrosContainer = document.getElementById('livros-container');
    const filtrosContainer = document.getElementById('filtros-container');
    const campoBusca = document.getElementById('campo-busca');
    const botaoBusca = document.getElementById('botao-busca');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    const loadingSpinner = document.getElementById('loading-spinner');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const modal = document.getElementById('book-details-modal');
    const modalContent = document.getElementById('modal-book-content');
    const favoritosBtn = document.getElementById('favoritos-btn');
    const randomBookBtn = document.getElementById('random-book-btn');
    const sortOptions = document.getElementById('sort-options');

    let livros = [];
    let swiper;
    let favoritos = new Set();
    let modoFavoritosAtivo = false;
    let filtrosAtivos = new Set();

    // Carrega os dados dos livros do JSON
    async function carregarLivros() {
        try {
            const response = await fetch('data.json');
            livros = await response.json();
            livros.forEach(livro => {
                livro.tags = livro.tags.map(tag => tag.trim().replace('#', ''));
            });
            exibirLivros(livros);
            criarBotoesFiltro(livros);
            // Carrega o estado salvo após os livros e botões serem criados
            carregarFavoritosSalvos();
            carregarTemaSalvo();
            carregarEstadoSalvo();
        } catch (error) {
            console.error('Erro ao carregar os livros:', error);
        }
    }

    // Exibe os livros no carrossel Swiper
    function exibirLivros(livrosParaExibir, termoBusca = '') {
        livrosContainer.innerHTML = '';

        // Função auxiliar para destacar o texto
        const highlightText = (text, highlight) => {
            if (!highlight.trim()) {
                return text;
            }
            // Cria uma expressão regular segura para encontrar o termo de busca,
            // de forma global (g) e insensível a maiúsculas/minúsculas (i).
            const regex = new RegExp(`(${highlight})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };

        // Se não houver livros, exibe a mensagem e para a execução.
        if (livrosParaExibir.length === 0) {
            livrosContainer.innerHTML = '<p class="nenhum-resultado">Nenhum livro encontrado com os filtros selecionados.</p>';
            if (swiper) {
                swiper.destroy(true, true);
                swiper = undefined;
            }
            return;
        }

        livrosParaExibir.forEach(livro => {
            // Aplica o destaque no nome, descrição e tags
            const nomeDestacado = highlightText(livro.nome, termoBusca);
            const descricaoDestacada = highlightText(livro.descricao, termoBusca);
            const tagsDestacadas = highlightText(livro.tags.join(', '), termoBusca);

            const isFavorito = favoritos.has(livro.nome);
            const card = `
                <div class="swiper-slide">
                    <article class="card">
                        <h2>${nomeDestacado}</h2>
                        <button class="favorite-btn ${isFavorito ? 'ativo' : ''}" data-book-name="${livro.nome}" title="Adicionar aos Favoritos">♥</button>
                        <p class="ano-publicacao">${livro.data_lancamento}</p>
                        <p>${descricaoDestacada}</p>
                        <div class="tags">${tagsDestacadas}</div> 
                        <a href="#" class="saiba-mais-btn" data-book-name="${livro.nome}">Saiba mais</a>
                    </article>
                </div>
            `;
            livrosContainer.innerHTML += card;
        });
        inicializarSwiper(livrosParaExibir.length);
    }

    // Inicializa ou atualiza a instância do Swiper
    function inicializarSwiper(numLivros) {
        if (swiper) { swiper.destroy(true, true); }

        swiper = new Swiper('.swiper-container', {
            loop: numLivros > 3,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                320: { slidesPerView: 1, spaceBetween: 20 },
                768: { slidesPerView: 2, spaceBetween: 30 },
                1024: { slidesPerView: 3, spaceBetween: 30 }
            }
        });
    }

    // Cria os botões de gênero dinamicamente
    function criarBotoesFiltro(livros) {
        const tagCounts = {};
        livros.forEach(livro => {
            livro.tags.forEach(tag => {
                if (tag) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
            });
        });

        // Ordena as tags pela contagem (mais populares primeiro)
        const tagsOrdenadas = Object.keys(tagCounts).sort((a, b) => {
            const diff = tagCounts[b] - tagCounts[a];
            if (diff === 0) {
                return a.localeCompare(b); // desempate alfabético
            }
            return diff;
        });

        const MAX_TAGS_VISIVEIS = 10;

        tagsOrdenadas.forEach(tag => {
            const botao = document.createElement('button');
            botao.className = 'filtro-tag';
            botao.textContent = `${tag} (${tagCounts[tag]})`; // Adiciona o contador
            botao.dataset.tag = tag;
            botao.addEventListener('click', () => toggleFiltro(tag, botao));

            // Adiciona a classe para esconder se exceder o limite
            if (tagsOrdenadas.indexOf(tag) >= MAX_TAGS_VISIVEIS) {
                botao.classList.add('filtro-tag-escondido');
            }

            filtrosContainer.insertBefore(botao, limparFiltrosBtn);
        });

        // Adiciona o botão "Ver mais" se houver tags escondidas
        if (tagsOrdenadas.length > MAX_TAGS_VISIVEIS) {
            const verMaisBtn = document.createElement('button');
            verMaisBtn.id = 'ver-mais-tags';
            verMaisBtn.className = 'filtro-tag-ver-mais';
            verMaisBtn.textContent = 'Ver mais';
            verMaisBtn.addEventListener('click', toggleTagsEscondidas);
            filtrosContainer.appendChild(verMaisBtn);
        }
    }

    // Adiciona ou remove um filtro da lista de ativos
    function toggleFiltro(tag, botao) {
        // Se o botão estiver desabilitado, não faz nada
        if (botao.disabled) {
            return;
        }
        botao.classList.toggle('ativo');
        if (filtrosAtivos.has(tag)) {
            filtrosAtivos.delete(tag);
        } else {
            filtrosAtivos.add(tag);
        }

        // Desativa o modo favoritos se um filtro de gênero for clicado
        modoFavoritosAtivo = false;
        favoritosBtn.classList.remove('ativo');
        
        limparFiltrosBtn.style.display = filtrosAtivos.size > 0 ? 'inline-block' : 'none';
        aplicarFiltros();
    }

    // Mostra ou esconde as tags menos populares
    function toggleTagsEscondidas() {
        const tagsEscondidas = document.querySelectorAll('.filtro-tag-escondido');
        const botao = document.getElementById('ver-mais-tags');
        const estaoVisiveis = botao.textContent === 'Ver menos';

        tagsEscondidas.forEach(tag => {
            tag.style.display = estaoVisiveis ? 'none' : 'inline-block';
        });

        botao.textContent = estaoVisiveis ? 'Ver mais' : 'Ver menos';
    }

    // Adiciona ou remove um livro dos favoritos
    function toggleFavorito(bookName, botao) {
        botao.classList.toggle('ativo');
        if (favoritos.has(bookName)) {
            favoritos.delete(bookName);
        } else {
            favoritos.add(bookName);
        }
        // Salva a lista atualizada no localStorage
        localStorage.setItem('favoritos', JSON.stringify(Array.from(favoritos)));

        // Se estiver no modo favoritos, atualiza a exibição
        if (modoFavoritosAtivo) aplicarFiltros();
    }

    // Mostra o modal com os detalhes do livro
    function mostrarDetalhes(bookName) {
        const livro = livros.find(l => l.nome === bookName);
        if (!livro) return;

        modalContent.innerHTML = `
            <div class="modal-main-content">
                <img src="${livro.imagem}" alt="Capa do livro ${livro.nome}" class="modal-book-cover">
                <div class="modal-book-details">
                    <h2>${livro.nome}</h2>
                    <p><strong>Ano de Lançamento:</strong> ${livro.data_lancamento}</p>
                    <p>${livro.descricao}</p>
                    <p><strong>Gêneros:</strong> ${livro.tags.join(', ')}</p>
                    <a href="${livro.link}" target="_blank" class="card-link">Ver na Wikipedia</a>
                </div>
            </div>
            <div class="share-container">
                <strong>Compartilhar:</strong>
                <div class="share-buttons">
                    <a href="https://twitter.com/intent/tweet?text=Recomendo a leitura de '${livro.nome}'. Saiba mais:&url=${encodeURIComponent(livro.link)}&hashtags=OraculoLiterario" target="_blank" class="share-btn twitter">Twitter</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(livro.link)}" target="_blank" class="share-btn facebook">Facebook</a>
                    <a href="https://api.whatsapp.com/send?text=Confira este livro que encontrei no Oráculo Literário: *${livro.nome}* %0A${encodeURIComponent(livro.link)}" target="_blank" class="share-btn whatsapp">WhatsApp</a>
                    <button id="copy-link-btn" class="share-btn copy" data-link="${livro.link}">Copiar Link</button>
                </div>
            </div>
        `;

        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Impede o scroll do fundo
    }

    // Esconde o modal
    function esconderDetalhes() {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Restaura o scroll do fundo
    }

    // Escolhe um livro aleatório e mostra seus detalhes
    function mostrarLivroAleatorio() {
        let livrosCandidatos = livros;

        // Se houver filtros de gênero ativos, filtra a lista de livros
        if (filtrosAtivos.size > 0) {
            livrosCandidatos = livros.filter(livro =>
                [...filtrosAtivos].some(filtro => livro.tags.includes(filtro))
            );
        }

        // Se não houver livros na lista (seja a original ou a filtrada), não faz nada.
        if (livrosCandidatos.length === 0) {
            // Mostra uma mensagem no modal se nenhum livro for encontrado
            modalContent.innerHTML = `
                <div class="modal-book-details" style="text-align: center; width: 100%;">
                    <h2>Nenhum livro encontrado</h2>
                    <p>Tente remover alguns filtros para receber uma sugestão aleatória.</p>
                </div>
            `;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Impede o scroll do fundo
            return; // Encerra a função aqui
        }

        const randomIndex = Math.floor(Math.random() * livrosCandidatos.length);
        const randomBook = livrosCandidatos[randomIndex];
        mostrarDetalhes(randomBook.nome);
    }

    // Limpa todos os filtros ativos
    function limparFiltros() {
        filtrosAtivos.clear();
        document.querySelectorAll('.filtro-tag.ativo').forEach(btn => {
            btn.classList.remove('ativo');
        });
        limparFiltrosBtn.style.display = 'none';

        // Limpa também o campo de busca por texto
        campoBusca.value = '';

        // Desativa o modo favoritos
        modoFavoritosAtivo = false;
        favoritosBtn.classList.remove('ativo');

        // Garante que os contadores e botões sejam recriados com os valores originais
        criarBotoesFiltro(livros);
        aplicarFiltros();
    }

    // Atualiza os contadores nos botões de gênero com base nos livros visíveis
    function atualizarContadoresDeTag(livrosVisiveis) {
        const tagCounts = {};
        livrosVisiveis.forEach(livro => {
            livro.tags.forEach(tag => {
                if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        document.querySelectorAll('.filtro-tag[data-tag]').forEach(botao => {
            const tag = botao.dataset.tag;
            const count = tagCounts[tag] || 0;
            botao.textContent = `${tag} (${count})`;
            botao.disabled = count === 0;
        });
    }

    // Aplica os filtros de gênero e a busca por texto
    function aplicarFiltros() {
        // Mostra o spinner
        loadingSpinner.style.display = 'block';

        const termoBusca = campoBusca.value.toLowerCase();
        let livrosFiltradosPorBusca = livros;

        // Salva o estado atual dos filtros e da busca
        localStorage.setItem('termoBusca', termoBusca);
        localStorage.setItem('filtrosAtivos', JSON.stringify(Array.from(filtrosAtivos)));
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
        localStorage.setItem('modoFavoritos', modoFavoritosAtivo);
        localStorage.setItem('sortOrder', sortOptions.value);


        // 1. Filtra primeiro pelo termo de busca
        if (termoBusca) {
            livrosFiltradosPorBusca = livros.filter(livro => {
                const nome = livro.nome.toLowerCase();
                const descricao = livro.descricao.toLowerCase();
                const tags = livro.tags.join(' ').toLowerCase();
                const ano = livro.data_lancamento; // O ano já é uma string
                return nome.includes(termoBusca) || descricao.includes(termoBusca) || tags.includes(termoBusca) || ano.includes(termoBusca);
            });
        }

        // Se o modo favoritos estiver ativo, ele tem prioridade sobre os filtros de gênero
        if (modoFavoritosAtivo) {
            livrosFiltradosPorBusca = livrosFiltradosPorBusca.filter(livro => favoritos.has(livro.nome));
        }

        atualizarContadoresDeTag(livrosFiltradosPorBusca); // Atualiza os contadores

        // 3. Aplica os filtros de gênero (tags) sobre a lista já filtrada pela busca
        // Esta etapa só é executada se o modo favoritos NÃO estiver ativo.
        let livrosFiltradosFinais = livrosFiltradosPorBusca;
        if (filtrosAtivos.size > 0 && !modoFavoritosAtivo) {
            livrosFiltradosFinais = livrosFiltradosPorBusca.filter(livro => {
                return [...filtrosAtivos].some(filtro => livro.tags.includes(filtro));
            });
        }

        // 4. Ordena o resultado final
        const sortOrder = sortOptions.value;
        switch (sortOrder) {
            case 'nome-az':
                livrosFiltradosFinais.sort((a, b) => a.nome.localeCompare(b.nome));
                break;
            case 'nome-za':
                livrosFiltradosFinais.sort((a, b) => b.nome.localeCompare(a.nome));
                break;
            case 'ano-recente':
                livrosFiltradosFinais.sort((a, b) => parseInt(b.data_lancamento) - parseInt(a.data_lancamento));
                break;
            case 'ano-antigo':
                livrosFiltradosFinais.sort((a, b) => parseInt(a.data_lancamento) - parseInt(b.data_lancamento));
                break;
            // O caso 'relevancia' não precisa de ação, pois mantém a ordem do filtro.
        }


        // 5. Exibe o resultado final
        // Esconde o spinner após um pequeno atraso para dar feedback visual
        setTimeout(() => {
            exibirLivros(livrosFiltradosFinais, termoBusca);
            loadingSpinner.style.display = 'none';
        }, 200); // 200ms de atraso
    }

    // Carrega os filtros salvos do localStorage ao iniciar a página
    function carregarEstadoSalvo() {
        const termoSalvo = localStorage.getItem('termoBusca');
        const filtrosSalvos = localStorage.getItem('filtrosAtivos');
        const modoFavoritosSalvo = localStorage.getItem('modoFavoritos') === 'true';
        const sortSalvo = localStorage.getItem('sortOrder');

        if (termoSalvo) {
            campoBusca.value = termoSalvo;
        }

        if (filtrosSalvos) {
            filtrosAtivos = new Set(JSON.parse(filtrosSalvos));
            // Atualiza a UI dos botões para refletir os filtros ativos
            document.querySelectorAll('.filtro-tag[data-tag]').forEach(botao => {
                if (filtrosAtivos.has(botao.dataset.tag)) {
                    botao.classList.add('ativo');
                }
            });
            if (filtrosAtivos.size > 0) {
                limparFiltrosBtn.style.display = 'inline-block';
            }
        }

        if (modoFavoritosSalvo) {
            modoFavoritosAtivo = true;
            favoritosBtn.classList.add('ativo');
        }

        if (sortSalvo) {
            sortOptions.value = sortSalvo;
        }

        // Aplica os filtros carregados
        if (termoSalvo || (filtrosSalvos && filtrosAtivos.size > 0) || sortSalvo || modoFavoritosSalvo) {
            aplicarFiltros();
        }
    }

    // Carrega os favoritos salvos do localStorage
    function carregarFavoritosSalvos() {
        const favoritosSalvos = localStorage.getItem('favoritos');
        if (favoritosSalvos) {
            favoritos = new Set(JSON.parse(favoritosSalvos));
        }
    }

    // Adiciona os "escutadores" de eventos
    campoBusca.addEventListener('input', aplicarFiltros); // Restaura a busca em tempo real
    limparFiltrosBtn.addEventListener('click', limparFiltros);
    randomBookBtn.addEventListener('click', mostrarLivroAleatorio);
    favoritosBtn.addEventListener('click', () => {
        modoFavoritosAtivo = !modoFavoritosAtivo;
        if (modoFavoritosAtivo) {
            favoritosBtn.classList.add('ativo');
        } else {
            favoritosBtn.classList.remove('ativo');
        }
        // Ao ativar favoritos, limpa os outros filtros para evitar conflito
        if (modoFavoritosAtivo) filtrosAtivos.clear();
        aplicarFiltros();
    });
    sortOptions.addEventListener('change', aplicarFiltros);

    // Event listener para os botões "Saiba mais" (usando delegação de eventos)
    livrosContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('saiba-mais-btn')) {
            event.preventDefault();
            mostrarDetalhes(target.dataset.bookName);
        } else if (target.classList.contains('favorite-btn')) {
            toggleFavorito(target.dataset.bookName, target);
        }
    });

    // Event listener para o botão "Copiar Link" dentro do modal
    modal.addEventListener('click', (event) => {
        if (event.target.id === 'copy-link-btn') {
            const link = event.target.dataset.link;
            navigator.clipboard.writeText(link).then(() => {
                event.target.textContent = 'Copiado!';
                setTimeout(() => {
                    event.target.textContent = 'Copiar Link';
                }, 2000); // Volta ao texto original após 2 segundos
            }).catch(err => {
                console.error('Erro ao copiar o link: ', err);
            });
        }
    });

    // Event listeners para fechar o modal
    modal.querySelector('.modal-close-btn').addEventListener('click', esconderDetalhes);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) { // Fecha se clicar no overlay
            esconderDetalhes();
        }
    });

    themeToggleBtn.addEventListener('click', toggleTheme);

    // Lógica para alternar o tema
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        themeToggleBtn.textContent = isLight ? '🌙' : '☀️';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    }

    // Carrega o tema salvo do localStorage
    function carregarTemaSalvo() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            themeToggleBtn.textContent = '🌙';
        } else {
            document.body.classList.remove('light-theme');
            themeToggleBtn.textContent = '☀️';
        }
    }

    // Lógica para o botão "Rolar para o Topo"
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    });

    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Inicia a aplicação
    carregarLivros();
});