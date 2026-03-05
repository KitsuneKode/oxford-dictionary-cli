#compdef oxf

_oxf() {
  emulate -L zsh

  local cur prev cmd action
  cur="${words[CURRENT]}"
  prev="${words[CURRENT - 1]}"
  cmd="${words[2]}"
  action="${words[3]}"

  local -a top_commands lookup_flags sync_flags config_actions config_keys channels
  top_commands=("lookup" "sync" "status" "doctor" "config" "--help" "-h")
  lookup_flags=("--json" "--more" "--online" "--timeout" "--no-color")
  sync_flags=("--channel" "--manifest")
  config_actions=("get" "set")
  config_keys=("syncManifestUrl" "enrichmentCacheTtlHours" "timeoutMs" "color")
  channels=("stable" "latest")

  if [[ $CURRENT -eq 2 ]]; then
    compadd -a top_commands
    return 0
  fi

  case "$cmd" in
    lookup)
      if [[ "$prev" == "--timeout" ]]; then
        _message "milliseconds"
        return 0
      fi

      if [[ "$cur" == -* ]]; then
        compadd -a lookup_flags
      fi
      return 0
      ;;
    sync)
      if [[ "$prev" == "--channel" ]]; then
        compadd -a channels
        return 0
      fi

      if [[ "$prev" == "--manifest" ]]; then
        _files
        return 0
      fi

      if [[ "$cur" == -* ]]; then
        compadd -a sync_flags
      fi
      return 0
      ;;
    config)
      if [[ $CURRENT -eq 3 ]]; then
        compadd -a config_actions
        return 0
      fi

      case "$action" in
        get)
          if [[ $CURRENT -eq 4 ]]; then
            compadd -a config_keys
          fi
          return 0
          ;;
        set)
          if [[ $CURRENT -eq 4 ]]; then
            compadd -a config_keys
            return 0
          fi

          if [[ $CURRENT -eq 5 ]]; then
            case "${words[4]}" in
              color)
                compadd true false
                ;;
              syncManifestUrl)
                _files
                ;;
              *)
                _message "value"
                ;;
            esac
          fi
          return 0
          ;;
      esac
      return 0
      ;;
    status|doctor|--help|-h)
      return 0
      ;;
    *)
      # direct mode: `oxf <word>`
      return 0
      ;;
  esac
}

if (( $+functions[compdef] )); then
  compdef _oxf oxf
fi
