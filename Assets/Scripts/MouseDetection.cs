using System;
using UnityEngine;
using UnityEngine.UI;

namespace DefaultNamespace
{
    public class MouseDetection : MonoBehaviour
    {
        private Vector3 _basicScale;
        [SerializeField] private float _factor;
        [SerializeField] private Text _title;
        [SerializeField] private string _url;

        private void Start()
        {
            _basicScale = transform.localScale;
        }

        public void OnHover()
        {
            transform.localScale = _basicScale *  _factor;
            _title.gameObject.SetActive(true);
            if (Input.GetMouseButtonUp(0))
            {
                Application.OpenURL(_url);
            }
        }

        public void OnExit()
        {
            transform.localScale = _basicScale;
            _title.gameObject.SetActive(false);
        }
    }
}