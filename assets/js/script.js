(function () {
    'use strict'

    //Setup
    const my_setup = getSetup()
    //Variáveis de rotas    
    const url_token = `${my_setup.host_http}/token`
    const url_perfil = `${my_setup.host_http}/client/perfil`
    const url_ws = `${my_setup.host_ws}`
    //Variáveis do DOM   
    // const view_chat = document.getElementById('j_view_chat')
    // const view_conectar = document.getElementById('j_view_conectar')
    // const spin_load = document.getElementById('j_spin_load')
    // const view_logout = document.getElementById('j_logout')
    // const btn_login = document.getElementById('j_btn_login')
    // const btn_conectar = document.getElementById('j_btn_conectar')
    // const btn_logout = document.getElementById('j_btn_logout')
    // const div_start_call = document.getElementById('j_div_start_call')
    // const div_input_msg = document.getElementById('j_div_input_msg')
    // const div_header_chat = document.getElementById('j_div_header_chat')
    // const div_status_client = document.getElementById('j_div_status_client')
    //Outras Variáveis
    // const btn_send = document.getElementById('j_btn_send')
    // const input_send = document.getElementById('j_input_send')
    const print_msg = document.getElementById('j_print_msg')
    // const print_calls = document.getElementById('j_print_calls')
    // const btn_start_call = document.getElementById('j_btn_start_call')
    // const btn_end_call = document.getElementById('j_btn_end_call')
    // const btn_cancel_call = document.getElementById('j_btn_cancel_call')
    //Variáveis de dados   
    var client = null
    var conn_ws = null
    var messages = null
    // var item_call = []
    // var data_calls = null
    // var client = null
    // var call = null
    //Comandos
    const cmd = {
        cmd_connection: cmdConnection,
        // cmd_call_data_clients: cmdCallDataClients,
        // cmd_call_history: cmdCallHistory,
        // cmd_call_msg: cmdCallMsg,
        // cmd_call_start: cmdCallStart,
        // cmd_token_expired: cmdTokenExpired,
        // cmd_error: cmdError,
        // cmd_call_end: cmdCallEnd,
        // cmd_call_cancel: cmdCallCancel
        cmd_call_create: cmdCallCreate,
        cmd_call_check_open: cmdCallCheckOpen,
        cmd_n_waiting_line: cmdNWaitingLine

    }
    //chatbox 
    const chatButton = document.querySelector('.chatbox__button');
    const chatContent = document.querySelector('.chatbox__support');
    const icons = {
        isClicked: '<i class="fa fa-times-circle-o fa-2x"></i>',
        isNotClicked: '<i class="fa fa-comments-o fa-2x"></i>'
    }
    const chatbox = new InteractiveChatbox(chatButton, chatContent, icons);


    //###############
    //  GERAL
    //###############

    //Consultar setup
    function getSetup() {
        return JSON.parse(sessionStorage.getItem("my_setup"))
    }

    //Passa UTC apara Hora e minutos local
    function formatTime(date) {
        let now
        let h

        if (date) {
            now = new Date(convertLocalDateToUTCDate(date));
            h = now.getHours() + ":" + ("0" + now.getMinutes()).slice(-2);
        } else {
            now = new Date();
            h = now.getHours() + ":" + ("0" + now.getMinutes()).slice(-2);
        }
        return h
    }

    //Adicionar mais scroll
    function addScroll() {
        print_msg.scrollTop += 500
    }

    //Botões de ação
    function actionButtons() {
        chatButton.onclick = () => chatboxContent()
    }

    //Converter UTC para data e hora local
    function convertLocalDateToUTCDate(date, toUTC) {
        date = new Date(date);
        //Hora local convertida para UTC     
        var localOffset = date.getTimezoneOffset() * 60000;
        var localTime = date.getTime();
        if (toUTC) {
            date = localTime + localOffset;
        } else {
            date = localTime - localOffset;
        }
        date = new Date(date);

        return date;
    }

    //Comando de token expirado
    function cmdTokenExpired(data) {
        notifyPrimary("O seu acesso ao chat expirou, vamos renova-lo em 5 segundos")
        setTimeout(function () {
            document.location.reload()
        }, 5000)
    }

    //Comando de error
    function cmdError(data) {
        notifyError(data.msg)
    }

    //###############
    //  Perfil
    //###############

    //Set dados do user
    function requestPerfil(token) {
        if (token) {

            //Config request
            let config = {
                method: 'GET',
                url: url_perfil,
                headers: {
                    'Content-Type': 'none',
                    'Authorization': `Bearer ${token}`,
                    'Access-Control-Allow-Origin': '*'
                },
                mode: 'cors'
            }

            //Request
            axios(config)
                .then(function (res) {
                    if (res.data.result) {
                        setUser(res.data.error.data)
                    } else {
                        console.log(res.data.error.msg);
                    }
                })
                .catch(function (err) {
                    console.log(err)
                });
        }
    }

    //Incluir dados do user na sessão
    function setUser(data) {
        sessionStorage.setItem("user", JSON.stringify(data))
        client = data
    }

    //Obter dados do user da sessão
    function getUser(data) {
        return JSON.parse(sessionStorage.getItem("user"))
    }

    //###############
    //  CALL
    //###############  

    //Obter os itens da lista de espera que estão listados na div pai
    function getPrintCall() {
        item_call = [...document.querySelectorAll('.j_item_call')]
    }

    //Ativar call selecionada
    function activeCall() {
        item_call.forEach((data) => { data.classList.remove('call-active') });
        this.classList.add('call-active');
        selectCall(this)
        sessionStorage.setItem('call_in_progress', this.dataset.call)
    }

    //Mensagem do cliente referente ao assunto da call
    function printCall(call, uuid, name, text, img, time, active = "", newmsg = false) {
        img = img ? img : "./assets/img/user.png"
        newmsg = newmsg ? 'block' : 'none'
        let html = `<a href="#" class="list-group-item d-flex gap-3 py-3 m-1 rounded shadow-sm j_item_call animate__animated animate__bounceInDown ${active}" data-call="${call}" data-uuid="${uuid}" aria-current="true">
                    <span class="position-absolute top-50 start-75 translate-middle p-1 bg-primary border border-white rounded-circle" style="display: ${newmsg}"></span>
                    <img src="${img}" alt="twbs" width="32" height="32" class="rounded-circle flex-shrink-0 border border-2 border-white">                        
                    <div class="d-flex gap-2 w-100 justify-content-between position-relative">                            
                        <div>
                            <h6 class="mb-0 fw-bold">${name}</h6>
                            <p class="mb-0 opacity-75">${text}</p>
                        </div>
                        <small class="opacity-50 text-nowrap">${time}</small>
                        <span class="position-absolute top-100 translate-middle badge rounded-pill bg-warning text-dark">#${call} </span>
                    </div>
                </a>`
        print_calls.insertAdjacentHTML('beforeend', html)
    }

    //Consultar e atualizar listar de espera
    function cmdCallDataClients(calls) {
        let call_in_progress = sessionStorage.getItem('call_in_progress')
        let active
        print_calls.innerHTML = ''

        if (calls) {
            Object.values(calls.clients).forEach(function (data) {
                active = call_in_progress == data.call.call_id ? 'call-active' : ''
                if (data.call.call_attendant_uuid == attendant.uuid) { //listar call iniciadas pelo atendente
                    printCall(data.call.call_id, data.user.uuid, data.user.name, data.call.call_objective, data.user.avatar, formatTime(data.call.call_update), active)
                } else if (data.call.call_status == '1') { //listar call não iniciadas ainda
                    printCall(data.call.call_id, data.user.uuid, data.user.name, data.call.call_objective, data.user.avatar, formatTime(data.call.call_update), active)
                } else { //listar call iniciadas por outros atendentes
                    //será implementado posteriormente                   
                }
            });

            getPrintCall()
            item_call.forEach(function (data) {
                data.addEventListener('click', activeCall, false);
            })

            data_calls = calls.clients

            if (!sessionStorage.getItem('call_in_progress')) {
                htmlInfoInitCall()
            }
            if (item_call.length == 0) {
                print_calls.innerHTML = '<span class="text-center p-1">Lista vazia.</span>'
            }
        } else {
            data_calls = null
        }
    }

    //Texto informativo para selecionar uma call
    function htmlInfoInitCall() {
        let html = `<div class="card bg-dark gap-3 py-3 p-2 m-5 shadow-lg rounded animate__animated animate__shakeX animate__delay-2s">
                    <div class="card-body text-center">
                        <h2><i class="bi bi-arrow-left"></i> Clique em um cliente da lista.</h2>
                    </div>
                </div>`
        let html2 = `<div class="card bg-dark gap-3 py-3 p-2 m-5 shadow-lg rounded animate__animated animate__backInUp animate__delay-2s">
                <div class="card-body text-center">
                    <h2><i class="bi bi-emoji-sunglasses"></i> A fila está vazia.</h2>
                </div>
            </div>`
        let call_in_progress = sessionStorage.getItem('call_in_progress')

        //Verificar se alguma ja foi selecionada antes       
        if (call_in_progress) {
            selectCallInProgress(call_in_progress)
        } else {
            print_msg.innerHTML = ''
            print_msg.insertAdjacentHTML('beforeend', html)
            setTimeout(function () {
                if (item_call.length == 0) {
                    print_msg.innerHTML = ''
                    print_msg.insertAdjacentHTML('beforeend', html2)
                }
            }, 1000)
        }
    }

    //Mostrar call já selecionada
    function selectCallInProgress(call_in_progress) {
        setTimeout(() => {
            let select_item = print_calls.querySelector(`[data-call="${call_in_progress}"]`)
            selectCall(select_item)
        }, 1500)
    }


    //###############
    //  CHAT
    //###############  

    //Povoar a mostrar cabeçalho do chat
    function headerChat(call_id) {
        if (call_id) {
            div_header_chat.style.display = 'block'
            div_header_chat.querySelector('img').src = client.avatar
            div_header_chat.querySelector('h6').innerText = `${client.name} ${client.lastname}`
            div_input_msg.dataset.call = call_id
        } else {
            div_header_chat.style.display = 'none'
            div_header_chat.querySelector('img').src = './assets/img/user.png'
            div_header_chat.querySelector('h6').innerText = 'Cliente'
            div_input_msg.dataset.call = ""
        }
    }

    //Selecionar call para troca de msg
    function selectCall(data) {

        let call_uuid = data.dataset.uuid
        let call_id = data.dataset.call
        call = data_calls[`call_${call_id}`].call
        client = data_calls[`call_${call_id}`].user
        print_msg.innerHTML = ''

        printMsgClient(client.name, call.call_objective, formatTime(call.call_update), client.avatar)

        sendMessage({
            "cmd": "cmd_call_history",
            "call": call_id,
            "limit": 500,
            "offset": 0
        })

        sendMessage({
            "cmd": "cmd_check_user_on",
            "check_on_uuid": call_uuid
        })
        headerChat(call_id)

        if (Number(call.call_status) == 1) {
            div_start_call.style.display = 'block'
            div_input_msg.style.display = 'none'
        } else {
            div_start_call.style.display = 'none'
            div_input_msg.style.display = 'flex'
        }
    }

    //Escreve msg do cliente
    function printMsgClient(name, text, time = false, img = false) {
        img = img ? img : "./assets/img/user.png"
        let html = ` <div class="list-group-item list-group-item d-flex gap-3 py-3 p-3 w-75 m-2 shadow msg-right animate__animated animate__fadeInDown">
                    <img src="${img}" alt="twbs" width="32" height="32" class="rounded-circle flex-shrink-0">
                    <div class="d-flex gap-2 w-100 justify-content-between">
                        <div>
                            <h6 class="mb-0 fw-bold">${name}</h6>
                            <p class="mb-0 opacity-75">${text}</p>
                        </div>
                        <small class="opacity-50 text-nowrap">${time}</small>
                    </div>
                </div>`
        print_msg.insertAdjacentHTML('beforeend', html)
        addScroll()
    }

    //Html da msg do atendente
    function printMsgAttendant(name, text, time) {
        let html = `<div class="list-group-item list-group-item d-flex gap-3 py-3 p-3 w-75 m-2 shadow align-self-end msg-left animate__animated animate__fadeInDown">
                    <div class="d-flex gap-2 w-100 justify-content-between">
                        <div>
                            <h6 class="mb-0 fw-bold">${name}</h6>
                            <p class="mb-0 opacity-75">${text}</p>
                        </div>
                        <small class="opacity-50 text-nowrap">${time}</small>
                    </div>
                </div>`
        print_msg.insertAdjacentHTML('beforeend', html)
        addScroll()
    }

    //Enviar mensagem
    function submitMsg() {

        if (input_send.value.trim().length > 0) {
            sendMessage({
                "cmd": "cmd_call_msg",
                "call": div_input_msg.dataset.call,
                "text": input_send.value
            })
            printMsgAttendant(attendant.name, input_send.value, formatTime())
            input_send.value = ""
            markNewMsg(div_input_msg.dataset.call, false)
        } else {
            notifyWarning("Mensagens vazias não podem ser enviadas!")
        }
    }

    //Print das mensagens recebidas
    function cmdCallMsg(data) {

        if (data.call == call.call_id) {
            printMsgClient(client.name, data.text, formatTime(data.date), client.avatar)
            markNewMsg(data.call, false)
        } else {
            markNewMsg(data.call, true)
        }
    }

    //Marcar e desmarcar novas mensagens
    function markNewMsg(id, newmsg = false) {
        newmsg = newmsg ? 'block' : 'none'
        document.querySelector(`.j_item_call[data-call="${id}"] span`).style.display = newmsg
    }

    //Iniciar call
    function startCall() {

        Swal.fire({
            title: 'Inicia este atendimento?',
            text: "Se iniciar este atendimento não será possível outro atendente iniciar!",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, iniciar este!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                sendMessage({
                    "cmd": "cmd_call_start",
                    "call": div_input_msg.dataset.call
                })
            }
        })
    }

    //Comando iniciar call
    function cmdCallStart(data) {
        notifyPrimary("Atendimento iniciado, boa sorte!")
        div_input_msg.style.display = 'flex'
        div_start_call.style.display = 'none'
    }

    //Finalizar call
    function endCall() {

        Swal.fire({
            title: 'Finalizar este atendimento?',
            text: "Se finalizar este atendimento não será possível enviar ou receber mais mensagens!",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, finalizar este!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                sendMessage({
                    "cmd": "cmd_call_end",
                    "call": call.call_id
                })
            }
        })
    }

    //Comando finalizar call
    function cmdCallEnd(data) {
        let html = `<div class="card bg-dark gap-3 py-3 p-2 m-5 shadow-lg rounded animate__animated animate__flipInX animate__delay-2s">
    <div class="card-body text-center">
        <h2><i class="bi bi-hand-thumbs-up"></i> Bom trabalho ${attendant.name}!</h2>
    </div>
    </div>`
        attendant = getUser()
        div_input_msg.style.display = 'none'
        div_start_call.style.display = 'none'
        print_msg.innerHTML = ''

        sessionStorage.removeItem('call_in_progress')
        headerChat()

        setTimeout(function () {
            if (item_call.length == 0) {
                print_msg.insertAdjacentHTML('beforeend', html)
            }
        }, 1000)

        notifyPrimary("Atendimento finalizado com sucesso!")
    }

    //Cancelar call
    function cancelCall() {
        Swal.fire({
            title: 'Cancelar este atendimento?',
            text: "Se cancelar este atendimento não será possível realizar outras ações para o mesmo!",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim',
            cancelButtonText: 'Não'
        }).then((result) => {
            if (result.isConfirmed) {
                sendMessage({
                    "cmd": "cmd_call_cancel",
                    "call": call.call_id
                })
            }
        })
    }

    //Comando cancelar call
    function cmdCallCancel() {
        let html = `<div class="card bg-dark gap-3 py-3 p-2 m-5 shadow-lg rounded animate__animated animate__flipInX animate__delay-2s">
    <div class="card-body text-center">
        <h2><i class="bi bi-hand-thumbs-up"></i> Bom trabalho ${attendant.name}!</h2>
    </div>
    </div>`
        attendant = getUser()
        div_input_msg.style.display = 'none'
        div_start_call.style.display = 'none'
        print_msg.innerHTML = ''

        sessionStorage.removeItem('call_in_progress')
        headerChat()

        setTimeout(function () {
            if (item_call.length == 0) {
                print_msg.insertAdjacentHTML('beforeend', html)
            }
        }, 1000)

        notifyPrimary("Atendimento cancelado com sucesso!")
    }


    //###############
    //  HISTÓRICO
    //###############  

    //Listar mensagens anteriores da call
    function cmdCallHistory(data) {
        printHistory(data.chat)
    }

    //Listar histórico de mensagens
    function printHistory(msgs) {
        let date //UTC da ultima mensagem do cliente      
        attendant = getUser()

        msgs.forEach(function (msg) {
            if (attendant.uuid == msg.origin) {
                date = msg.date
                printMsgAttendant(attendant.name, msg.text, formatTime(msg.date))
            } else {
                printMsgClient(client.name, msg.text, formatTime(msg.date), client.avatar)
            }
        });
    }




    //###############
    //  TOKEN
    //###############

    //Obter token
    function createToken(callback) {

        if (checkExpToken()) {

            let data = new FormData();
            data.append('uuid', my_setup.uuid);
            data.append('type', my_setup.type);
            data.append('public', my_setup.public);
            data.append('name', my_setup.name);
            data.append('avatar', my_setup.avatar);
            data.append('lastname', my_setup.lastname);

            //Config request
            let config = {
                method: 'POST',
                url: url_token,
                headers: {
                    'Content-Type': 'form-data',
                    'Access-Control-Allow-Origin': '*'
                },
                data: data,
                mode: 'cors'
            }

            //Request
            axios(config)
                .then(function (res) {
                    if (res.data.result) {
                        saveDataToken(res.data.error)
                        requestPerfil(res.data.error.token)
                        callback(my_setup.name)
                        //initSocket(res.data.error.token)         
                    } else {
                        // changeState('conectar')
                        console.log(res.data.error.msg)
                    }
                })
                .catch(function (err) {
                    // changeState('conectar')     
                    console.log(err)
                    console.log('Não foi possível gerar sua autentificação, erro na conexão com o servidor HTTP.')
                });
        } else {
            callback(my_setup.name)
            //changeState('chat')          
        }
    }

    //Salvar token no session storage
    function saveDataToken(data) {
        if (data == null) {
            sessionStorage.setItem('token_chat', "");
        } else {
            sessionStorage.setItem('token_chat', data.token);
        }
    }

    //Recuperar token do session storage
    function getToken() {
        return sessionStorage.getItem('token_chat');
    }

    //verificar se o token expirou - true = vencido
    function checkExpToken() {
        let res = true

        if (getToken()) {
            let now_seg = parseInt(Date.now() / 1000)
            let [, base] = (getToken()).split(".")
            let exp = JSON.parse(atob(base)).exp
            res = now_seg > exp ? true : false
        }
        return res
    }


    //###############
    //  Chat
    //###############   

    //Formulário de solicitação
    function formCreateCall(name) {
        let html = `<div class="text-center p-2 mb-3">                      
                        <span>${name}, por gentileza, preencha o formulário para solicitar bate-papo!</span>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Assunto:</label>
                        <select class="form-select" name="subject">
                            <option value="" selected disabled>Selecione</option>
                            <option value="Dúvidas">Dúvidas</option>
                            <option value="Problemas">Problemas</option>
                            <option value="Outros">Outros</option>
                        </select>
                        <div class="invalid-feedback">
                            Por favor, selecione um assunto.
                        </div>
                    </div>
                    <div class="mb-3">
                        <button class="btn btn-outline-success btn-block" id="j_call_create">
                            <i class="fa fa-comments" aria-hidden="true"></i> Solicitar bate-papo
                        </button>
                    </div>`
        print_msg.innerHTML = html
        document.getElementById('j_call_create').onclick = () => validFormCreateCall()
    }

    //Enviar Formulário de solicitação
    function validFormCreateCall() {
        let subject = print_msg.querySelector("select[name=subject]").value
        let invalid = print_msg.querySelector(".invalid-feedback")
        let loading = `<div class="text-center">
                        <div class="spinner-border text-info" role="status">
                        <span class="visually-hidden"></span>
                        </div>
                    </div>`

        if (subject) {
            print_msg.innerHTML = loading
            initSocket(getToken(), subject)
        } else {
            invalid.style.display = "block"
            setTimeout(() => {
                invalid.style.display = "none"
            }, 4000)
        }
    }

    //Enviar dados para abertura da call
    function sendCallCreate(subject) {
        sendMessage({
            "cmd": "cmd_call_create",
            "objective": subject
        })
    }

    //Comando ao criar call
    function cmdCallCreate(data) {
        console.log(data)
    }

    //Comando de call aberta
    function cmdCallCheckOpen(data) {
        console.log(data)
    }

    //Comando do número da fila da call
    function cmdNWaitingLine(data){
        console.log(data)
    }

    //Conteúdo do chatbox
    function chatboxContent() {
        if (chatbox.state) {
            let chatbox_content = sessionStorage.getItem("chatbox_content")

            if (chatbox_content == "call_create") {
                createToken(formCreateCall)
            } else if (chatbox_content == "call_cancel") {
            } else if (chatbox_content == "call_start") {
            } else if (chatbox_content == "call_msg") {
            } else if (chatbox_content == "call_end") {
            } else if (chatbox_content == "call_evaluation") {
            } else if (chatbox_content == "waiting_line") {
            } else {
                createToken(formCreateCall)
                sessionStorage.setItem("chatbox_content", "call_create")
            }

        }
    }


    //###############
    //  WEBSOCKET
    //###############

    //Abrir conexão
    function initSocket(token, subject) {

        conn_ws = new WebSocket(`${url_ws}/?t=${token}`);

        //Evento ao abrir conexão
        conn_ws.addEventListener('open', open => {
            sendMessage({
                "cmd": "cmd_call_check_open"
            })
        })

        //Evento ao enviar/receber mensagens
        conn_ws.addEventListener('message', message => {
            messages = JSON.parse(message.data)        
            console.log(messages)
            
            if (messages.result) {
                cmd[messages.error.data.cmd](messages.error.data)
            } else if (messages.error.data.cmd == "cmd_call_check_open") {
                sendCallCreate(subject)
                console.log("Não existe call aberta!")
            } else {
                console.log(messages.error.msg)
            }
        })

        //Evento de error
        conn_ws.addEventListener('error', error => {
            console.log(`Error na conexão com o servidor de chat!`)
        })

        //Evento ao fechar conexão
        conn_ws.addEventListener('close', close => {

            if (close.code == 1006) {
                console.log(`O servidor de chat está offline!`)
            } else if (close.code == 1000) {
                console.log(`Conexão encerrada: ${messages.error.msg}`)
            }
        })
    }

    //Enviar msg
    function sendMessage(msg) {
        conn_ws.send(JSON.stringify(msg));
    }

    //Fechar conexão
    function closeConn() {
        if (conn_ws) {
            conn_ws.close()
        }
        sessionStorage.removeItem('call_in_progress')
        sessionStorage.removeItem('user')
        sessionStorage.removeItem('token_chat')
        div_start_call.style.display = 'none'
        div_input_msg.style.display = 'none'
        headerChat()
        htmlInfoInitCall()
    }

    //Cmd conectado
    function cmdConnection() {
       // console.log("Conectado no Ws de chat!")
    }



    //###############
    //  INICIAR
    //###############   

    function init() {
        chatbox.display()
        chatbox.toggleIcon(false, chatButton)
        actionButtons()
    }

    init()
})()