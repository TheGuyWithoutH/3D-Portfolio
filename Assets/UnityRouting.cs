using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class UnityRouting : MonoBehaviour
{
    [SerializeField] private string _url;
    
    public void RouteToUrl() {
        Application.OpenURL(_url);
    }
}
