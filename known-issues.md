Не понятно
(low) 1) как билдить на сервере
(low) 2) как пушнуть апдейт с сервера, там есть коммент

== 3) не понятно, почему не запускается приложение через кнопку в cpanel, приходится запускать через terminal: node build/index.js

(low) 4) форматирование reply сообщения с кодом, где используется ``` code ```
== 5) озвучивание ответа - https://ttsmp3.com/ - amazon polly
6) мульти-юзерность

(low) 7) найти сервер
8) чистить сессию при удалении поста в группе - с помощью bot api это невозможно сделать, ничего не тригерится на удаление поста
== 9) сохранять сессию на сервере, чтобы при перезапуске бота не терялся контекст
== 10) возможность выбора включения озвучивания текста и распознавания

9) fix thread config inside thread

10) помечать сообщения в режиме repeat fixed message, чтобы отличать их от других сообщений в трэде. Т.к. эти сообщения не записываются в историю для чата GPT

Resolved issues
1) ```npm ERR! request to https://registry.npmjs.org/@types%2ffs-extra failed, reason: unable to get local issuer certificate```
   
https://stackoverflow.com/a/46408398

2) ```FetchError: request to https://api.telegram.org/bot6223615976:[REDACTED]/getMe failed, reason: self signed certificate in certificate chain```

https://stackoverflow.com/a/55220462

https://weekendprojects.dev/posts/fix-for-npm-error-code-self-signed-cert-in-chain/#1-upgrade-node-and-npm-version-or-let-npm-to-use-known-registrars:~:text=2.-,Use%20the%20command%20export%20NODE_TLS_REJECT_UNAUTHORIZED%3D0,-We%20can%20set

3) https://stackoverflow.com/questions/8313628/node-js-request-how-to-emitter-setmaxlisteners
