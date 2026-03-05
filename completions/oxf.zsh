#compdef oxf

_oxf() {
  emulate -L zsh

  local context curcontext="$curcontext" state line ret=1
  typeset -A opt_args
  typeset -a _arguments_options
  _arguments_options=(-s -S -C)

  _arguments "${_arguments_options[@]}" \
    "-h[Show help]" \
    "--help[Show help]" \
    "1:command:->oxf-command" \
    "*::arg:->oxf-args" && ret=0

  case "$state" in
    oxf-command)
      _values "oxf command" \
        "lookup[Lookup a word]" \
        "sync[Sync dictionary dataset]" \
        "status[Show local dataset status]" \
        "doctor[Run environment checks]" \
        "config[Get or set configuration values]" \
        "--help[Show help]" \
        "-h[Show help]"
      ret=0
      ;;
    oxf-args)
      case "${words[2]}" in
        lookup)
          _arguments "${_arguments_options[@]}" \
            "--json[Print JSON output]" \
            "--more[Show detailed local sections]" \
            "--online[Enable online enrichment]" \
            "--timeout[Set timeout in milliseconds]:milliseconds:" \
            "--no-color[Disable color output]" \
            "*:word:_default" && ret=0
          ;;
        sync)
          _arguments "${_arguments_options[@]}" \
            "--channel[Choose sync channel]:channel:(stable latest)" \
            "--manifest[Manifest URL or local path]:manifest:_files" && ret=0
          ;;
        config)
          _arguments "${_arguments_options[@]}" \
            "1:action:(get set)" \
            "2:key:->oxf-config-key" \
            "3:value:->oxf-config-value" && ret=0

          case "$state" in
            oxf-config-key)
              _values "config key" \
                "syncManifestUrl" \
                "enrichmentCacheTtlHours" \
                "timeoutMs" \
                "color"
              ret=0
              ;;
            oxf-config-value)
              case "${words[4]}" in
                color)
                  _values "boolean" true false
                  ;;
                syncManifestUrl)
                  _files
                  ;;
                *)
                  _message "value"
                  ;;
              esac
              ret=0
              ;;
          esac
          ;;
        status | doctor | --help | -h)
          ret=0
          ;;
        *)
          # direct mode (`oxf <word>`) intentionally has no special completion.
          ret=0
          ;;
      esac
      ;;
  esac

  return ret
}

if [ "$funcstack[1]" = "_oxf" ]; then
  _oxf "$@"
else
  if ! (( $+functions[compdef] )); then
    autoload -Uz compinit
    compinit -i -d "${XDG_CACHE_HOME:-$HOME/.cache}/zsh/.zcompdump-oxf"
  fi

  compdef _oxf oxf
fi
